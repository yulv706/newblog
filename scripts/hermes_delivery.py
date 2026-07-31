#!/usr/bin/env python3
"""Serialize Hermes delivery and protect the Weixin account from send bursts."""

from __future__ import print_function

import datetime
import errno
import fcntl
import hashlib
import hmac
import json
import math
import os
import re
import socket
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


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
UPSTREAM_REJECTION_MARKERS = (
    "http 502",
    "bad gateway",
    "delivery failed",
    "target rejected",
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


def _is_upstream_rejection(detail):
    lowered = detail.lower()
    return any(marker in lowered for marker in UPSTREAM_REJECTION_MARKERS)


def _message_key(target, subject, message):
    payload = "\0".join((target, subject or "", message.strip())).encode("utf-8")
    return "message:" + hashlib.sha256(payload).hexdigest()


def _webhook_settings():
    url = os.environ.get(
        "HERMES_WEBHOOK_URL",
        "http://127.0.0.1:8644/webhooks/newblog-notify",
    ).strip()
    secret = os.environ.get("HERMES_WEBHOOK_SECRET", "").strip()
    secret_path = os.environ.get(
        "HERMES_WEBHOOK_SECRET_FILE",
        "/etc/newblog-hermes-webhook.secret",
    ).strip()
    if not secret and secret_path:
        try:
            with open(secret_path, "r", encoding="utf-8") as handle:
                secret = handle.read().strip()
        except OSError as exc:
            raise RuntimeError(
                "Hermes webhook secret is unavailable at {}: {}".format(
                    secret_path,
                    exc,
                )
            )
    if not url.startswith(("http://127.0.0.1:", "http://localhost:")):
        raise RuntimeError("Hermes webhook must use a loopback URL")
    if len(secret) < 32:
        raise RuntimeError("Hermes webhook secret is missing or too short")
    return url, secret


def _post_webhook(url, secret, message, request_id, timeout):
    body = json.dumps(
        {"message": message},
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")
    signature = hmac.new(
        secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    request = Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Request-ID": request_id,
        },
        method="POST",
    )
    try:
        response = urlopen(request, timeout=timeout)
        try:
            status = int(response.getcode() or 0)
            response_body = response.read().decode("utf-8", "replace")
        finally:
            response.close()
    except HTTPError as exc:
        try:
            response_body = exc.read().decode("utf-8", "replace")
        except Exception:
            response_body = ""
        raise RuntimeError(
            "Hermes webhook returned HTTP {}: {}".format(
                exc.code,
                _compact(response_body or exc.reason),
            )
        )
    except (URLError, socket.timeout, TimeoutError) as exc:
        raise RuntimeError("Hermes webhook request failed: {}".format(_compact(exc)))

    if status < 200 or status >= 300:
        raise RuntimeError(
            "Hermes webhook returned HTTP {}: {}".format(
                status,
                _compact(response_body),
            )
        )
    try:
        result = json.loads(response_body or "{}")
    except ValueError:
        raise RuntimeError("Hermes webhook returned invalid JSON")
    if result.get("status") not in ("delivered", "duplicate"):
        raise RuntimeError(
            "Hermes webhook did not confirm delivery: {}".format(
                _compact(response_body)
            )
        )
    return result


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
        "HERMES_RATE_LIMIT_MAX_SECONDS", 900, minimum=rate_limit_base, maximum=86400
    )
    upstream_rejection_backoff = _env_int(
        "HERMES_UPSTREAM_REJECTION_BACKOFF_SECONDS",
        21600,
        minimum=900,
        maximum=86400,
    )
    dedupe_seconds = _env_int(
        "HERMES_DEDUPE_SECONDS", 900, minimum=60, maximum=86400
    )
    idempotency_seconds = _env_int(
        "HERMES_IDEMPOTENCY_SECONDS", 604800, minimum=3600, maximum=2592000
    )

    del container
    if not target.startswith("weixin:"):
        raise RuntimeError("Hermes webhook delivery requires a Weixin target")
    webhook_url, webhook_secret = _webhook_settings()
    delivery_message = message.strip()
    if subject:
        delivery_message = "{}\n\n{}".format(subject.strip(), delivery_message)
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
                _post_webhook(
                    webhook_url,
                    webhook_secret,
                    delivery_message,
                    delivery_key,
                    timeout=timeout,
                )
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
            except Exception as exc:
                detail = _compact(exc)
            state["lastError"] = detail
            state["lastErrorAt"] = _utc_now()

            if _is_rate_limited(detail) or _is_upstream_rejection(detail):
                strikes = min(6, int(state.get("rateLimitStrikes") or 0) + 1)
                reported_delay = _retry_delay(detail, rate_limit_base)
                if _is_upstream_rejection(detail):
                    backoff = upstream_rejection_backoff
                else:
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
                # Do not retry an upstream account rejection inside the same process.
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
