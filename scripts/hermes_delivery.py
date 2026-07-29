#!/usr/bin/env python3
"""Reliable Hermes message delivery with bounded transient retries."""

from __future__ import print_function

import math
import re
import subprocess
import time


TRANSIENT_MARKERS = (
    "rate limit",
    "cooldown active",
    "temporarily unavailable",
    "server disconnected",
    "connection reset",
    "connection refused",
    "timed out",
    "timeout",
    "hermes send failed",
)


def _compact(value, limit=500):
    text = " ".join(str(value or "").split())
    if len(text) <= limit:
        return text
    return text[: max(0, limit - 1)].rstrip() + "…"


def _retry_delay(detail, minimum_seconds):
    match = re.search(
        r"(?:cooldown active for|retry(?:ing)? after)\s+([0-9]+(?:\.[0-9]+)?)s",
        detail,
        flags=re.IGNORECASE,
    )
    if not match:
        return minimum_seconds
    return max(minimum_seconds, min(120, int(math.ceil(float(match.group(1)))) + 2))


def _is_transient(detail):
    lowered = detail.lower()
    return any(marker in lowered for marker in TRANSIENT_MARKERS)


def send_hermes_message(
    container,
    target,
    message,
    subject=None,
    timeout=60,
    max_attempts=4,
    min_retry_seconds=35,
    logger=None,
):
    attempts = max(1, int(max_attempts))
    retry_floor = max(1, int(min_retry_seconds))
    command = [
        "docker",
        "exec",
        "-i",
        "-u",
        "hermes",
        container,
        "/opt/hermes/.venv/bin/hermes",
        "send",
        "--to",
        target,
    ]
    if subject:
        command.extend(["--subject", subject])
    # --quiet suppresses the Weixin adapter's structured error response, which
    # makes retryable rate limits look like permanent empty failures.
    command.extend(["--file", "-", "--json"])
    payload = (message.strip() + "\n").encode("utf-8")

    for attempt in range(1, attempts + 1):
        try:
            completed = subprocess.run(
                command,
                input=payload,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=timeout,
            )
        except subprocess.TimeoutExpired:
            detail = "Hermes send timed out after {}s".format(timeout)
            if attempt >= attempts:
                raise RuntimeError(detail)
            delay = retry_floor
            if logger:
                logger(
                    "Hermes delivery attempt {}/{} timed out; retrying in {}s".format(
                        attempt,
                        attempts,
                        delay,
                    )
                )
            time.sleep(delay)
            continue

        if completed.returncode == 0:
            return attempt

        stderr = completed.stderr.decode("utf-8", "replace").strip()
        stdout = completed.stdout.decode("utf-8", "replace").strip()
        detail = _compact(
            stderr
            or stdout
            or "Hermes send failed with exit code {}".format(completed.returncode)
        )
        if attempt >= attempts or not _is_transient(detail):
            raise RuntimeError(detail)

        delay = _retry_delay(detail, retry_floor)
        if logger:
            logger(
                "Hermes delivery attempt {}/{} was transient; retrying in {}s: {}".format(
                    attempt,
                    attempts,
                    delay,
                    detail,
                )
            )
        time.sleep(delay)

    raise RuntimeError("Hermes send failed")
