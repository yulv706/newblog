#!/usr/bin/env python3
"""Serialize Hermes delivery and protect the Weixin account from send bursts."""

from __future__ import print_function

import datetime
import errno
import fcntl
import hashlib
import json
import math
import os
import re
import subprocess
import time


TRANSIENT_MARKERS = (
    "temporarily unavailable",
    "server disconnected",
    "connection reset",
    "connection refused",
    "timed out",
    "timeout",
    "hermes send failed",
)
RATE_LIMIT_MARKERS = (
    "rate limit",
    "cooldown active",
    "too many requests",
    "http 429",
    "status 429",
)


class HermesDeliveryDeferred(RuntimeError):
    """Delivery was safely deferred because the shared account is cooling down."""


def _compact(value, limit=500):
    text = " ".join(str(value or "").split())
    if len(text) <= limit:
        return text
    return text[: max(0, limit - 3)].rstrip() + "..."


def _utc_now():
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def _read_json(path, default):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            value = json.load(handle)
        return value if isinstance(value, dict) else default
    except (OSError, ValueError):
        return default


def _atomic_write_json(path, value):
    directory = os.path.dirname(path)
    if directory:
        os.makedirs(directory, mode=0o700, exist_ok=True)
    temporary = "{}.{}.tmp".format(path, os.getpid())
    with open(temporary, "w", encoding="utf-8") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())
    os.chmod(temporary, 0o600)
    os.replace(temporary, path)


def _env_int(name, default, minimum=0, maximum=None):
    try:
        value = int(os.environ.get(name, str(default)))
    except (TypeError, ValueError):
        value = default
    value = max(minimum, value)
    if maximum is not None:
        value = min(maximum, value)
    return value


def _delivery_paths():
    state_dir = os.environ.get(
        "HERMES_DELIVERY_STATE_DIR",
        "/var/lib/newblog-hermes-delivery",
    ).strip()
    if not state_dir:
        state_dir = "/var/lib/newblog-hermes-delivery"
    return (
        os.path.join(state_dir, "delivery.lock"),
        os.path.join(state_dir, "state.json"),
    )


def _retry_delay(detail, minimum_seconds):
    match = re.search(
        r"(?:cooldown active for|retry(?:ing)? after)\s+([0-9]+(?:\.[0-9]+)?)s",
        detail,
        flags=re.IGNORECASE,
    )
    if not match:
        return minimum_seconds
    return max(minimum_seconds, min(120, int(math.ceil(float(match.group(1)))) + 2))


def _is_rate_limited(detail):
    lowered = detail.lower()
    return any(marker in lowered for marker in RATE_LIMIT_MARKERS)


def _is_transient(detail):
    lowered = detail.lower()
    return any(marker in lowered for marker in TRANSIENT_MARKERS)


def _message_key(target, subject, message):
    payload = "\0".join((target, subject or "", message.strip())).encode("utf-8")
    return "message:" + hashlib.sha256(payload).hexdigest()


def _prune_deliveries(deliveries, now_epoch, retention_seconds):
    if not isinstance(deliveries, dict):
        return {}
    minimum_epoch = now_epoch - retention_seconds
    recent = {}
    for key, value in deliveries.items():
        try:
            delivered_epoch = float(value)
        except (TypeError, ValueError):
            continue
        if delivered_epoch >= minimum_epoch:
            recent[str(key)] = delivered_epoch
    if len(recent) <= 256:
        return recent
    return dict(
        sorted(recent.items(), key=lambda item: item[1], reverse=True)[:256]
    )


def _acquire_lock(handle, timeout_seconds):
    deadline = time.time() + timeout_seconds
    while True:
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            return
        except OSError as exc:
            if exc.errno not in (errno.EACCES, errno.EAGAIN):
                raise
            remaining = deadline - time.time()
            if remaining <= 0:
                raise HermesDeliveryDeferred(
                    "Hermes delivery queue is busy; deferred after {}s".format(
                        timeout_seconds
                    )
                )
            time.sleep(min(1, remaining))


def send_hermes_message(
    container,
    target,
    message,
    subject=None,
    timeout=60,
    max_attempts=4,
    min_retry_seconds=35,
    logger=None,
    idempotency_key=None,
):
    attempts = max(1, int(max_attempts))
    retry_floor = max(1, int(min_retry_seconds))
    lock_timeout = _env_int(
        "HERMES_DELIVERY_LOCK_TIMEOUT_SECONDS", 90, minimum=5, maximum=600
    )
    min_send_interval = _env_int(
        "HERMES_MIN_SEND_INTERVAL_SECONDS", 45, minimum=5, maximum=300
    )
    rate_limit_base = _env_int(
        "HERMES_RATE_LIMIT_BASE_SECONDS", 90, minimum=30, maximum=1800
    )
    rate_limit_max = _env_int(
        "HERMES_RATE_LIMIT_MAX_SECONDS", 900, minimum=rate_limit_base, maximum=3600
    )
    dedupe_seconds = _env_int(
        "HERMES_DEDUPE_SECONDS", 900, minimum=60, maximum=86400
    )
    idempotency_seconds = _env_int(
        "HERMES_IDEMPOTENCY_SECONDS", 604800, minimum=3600, maximum=2592000
    )

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
    # --quiet hides structured Weixin errors and must not be used here.
    command.extend(["--file", "-", "--json"])
    payload = (message.strip() + "\n").encode("utf-8")
    automatic_key = _message_key(target, subject, message)
    delivery_key = (
        "idempotency:" + str(idempotency_key).strip()
        if idempotency_key
        else automatic_key
    )
    retention_seconds = max(dedupe_seconds, idempotency_seconds)

    lock_path, state_path = _delivery_paths()
    os.makedirs(os.path.dirname(lock_path), mode=0o700, exist_ok=True)
    lock_handle = open(lock_path, "a+")
    try:
        queue_started_epoch = time.time()
        _acquire_lock(lock_handle, lock_timeout)
        queue_wait_seconds = time.time() - queue_started_epoch
        state = _read_json(state_path, {})
        now_epoch = time.time()
        deliveries = _prune_deliveries(
            state.get("recentDeliveries"),
            now_epoch,
            retention_seconds,
        )
        duplicate_window = idempotency_seconds if idempotency_key else dedupe_seconds
        delivered_epoch = float(deliveries.get(delivery_key) or 0)
        if delivered_epoch and now_epoch - delivered_epoch < duplicate_window:
            if logger:
                logger(
                    "Hermes delivery skipped duplicate key={} age={}s".format(
                        delivery_key[:80],
                        int(now_epoch - delivered_epoch),
                    )
                )
            return 0

        next_allowed_epoch = max(
            float(state.get("nextAllowedEpoch") or 0),
            float(state.get("lastSuccessEpoch") or 0) + min_send_interval,
        )
        wait_seconds = max(0, int(math.ceil(next_allowed_epoch - now_epoch)))
        if wait_seconds:
            remaining_queue_budget = max(0, lock_timeout - queue_wait_seconds)
            if wait_seconds > remaining_queue_budget:
                raise HermesDeliveryDeferred(
                    "Hermes account cooldown active for {}s; delivery deferred".format(
                        wait_seconds
                    )
                )
            if logger:
                logger(
                    "Hermes delivery gate waiting {}s before the next send".format(
                        wait_seconds
                    )
                )
            time.sleep(wait_seconds)

        for attempt in range(1, attempts + 1):
            state["lastAttemptEpoch"] = time.time()
            state["lastAttemptAt"] = _utc_now()
            state["lastDeliveryKey"] = delivery_key
            _atomic_write_json(state_path, state)
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
                state["lastError"] = detail
                state["lastErrorAt"] = _utc_now()
                _atomic_write_json(state_path, state)
                if attempt >= attempts:
                    raise RuntimeError(detail)
                if logger:
                    logger(
                        "Hermes delivery attempt {}/{} timed out; retrying in {}s".format(
                            attempt,
                            attempts,
                            retry_floor,
                        )
                    )
                time.sleep(retry_floor)
                continue

            if completed.returncode == 0:
                now_epoch = time.time()
                deliveries[delivery_key] = now_epoch
                state.update(
                    {
                        "lastSuccessEpoch": now_epoch,
                        "lastSuccessAt": _utc_now(),
                        "nextAllowedEpoch": now_epoch + min_send_interval,
                        "rateLimitStrikes": 0,
                        "lastError": "",
                        "lastErrorAt": "",
                        "recentDeliveries": deliveries,
                    }
                )
                _atomic_write_json(state_path, state)
                return attempt

            stderr = completed.stderr.decode("utf-8", "replace").strip()
            stdout = completed.stdout.decode("utf-8", "replace").strip()
            detail = _compact(
                stderr
                or stdout
                or "Hermes send failed with exit code {}".format(completed.returncode)
            )
            state["lastError"] = detail
            state["lastErrorAt"] = _utc_now()

            if _is_rate_limited(detail):
                strikes = min(6, int(state.get("rateLimitStrikes") or 0) + 1)
                reported_delay = _retry_delay(detail, rate_limit_base)
                backoff = min(
                    rate_limit_max,
                    max(reported_delay, rate_limit_base * (2 ** (strikes - 1))),
                )
                state["rateLimitStrikes"] = strikes
                state["nextAllowedEpoch"] = time.time() + backoff
                state["lastRateLimitAt"] = _utc_now()
                _atomic_write_json(state_path, state)
                if logger:
                    logger(
                        "Hermes account rate limited; deferring all sends for {}s".format(
                            backoff
                        )
                    )
                # Do not retry a Weixin account limit inside the same process.
                # The persistent gate protects every other sender as well.
                raise HermesDeliveryDeferred(
                    "Hermes account rate limited; shared cooldown active for {}s".format(
                        backoff
                    )
                )

            _atomic_write_json(state_path, state)
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
    finally:
        try:
            fcntl.flock(lock_handle.fileno(), fcntl.LOCK_UN)
        except OSError:
            pass
        lock_handle.close()
