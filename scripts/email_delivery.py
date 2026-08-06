#!/usr/bin/env python3
"""Small, dependency-free SMTP delivery helper for host-side jobs.

The blog container already owns the SMTP settings used for login codes.  The
host-side scheduled jobs use this module so email notifications share the same
credentials without duplicating the password in another configuration file.
"""

from __future__ import print_function

import hashlib
import os
import smtplib
import ssl
import time
from email.header import Header
from email.mime.text import MIMEText
from email.utils import formataddr, parseaddr


class EmailDeliveryError(RuntimeError):
    """A safe-to-log email failure without exposing SMTP credentials."""


def _strip_quotes(value):
    value = str(value or "").strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        return value[1:-1]
    return value


def read_env_file(path):
    values = {}
    if not path:
        return values
    try:
        with open(path, "r", encoding="utf-8") as handle:
            for raw_line in handle:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                if key:
                    values[key] = _strip_quotes(value)
    except OSError:
        return values
    return values


def default_env_file():
    repo_root = os.environ.get("NEWBLOG_REPO_ROOT", "/root/workspace/newblog")
    return os.environ.get(
        "PROACTIVE_EMAIL_ENV_FILE",
        os.path.join(repo_root, "deploy", ".env.production"),
    ).strip()


def _setting(values, key, default=""):
    if key in os.environ:
        return os.environ.get(key, "").strip()
    return str(values.get(key, default) or "").strip()


def load_email_config(env_file=None):
    values = read_env_file(env_file or default_env_file())
    host = _setting(values, "SMTP_HOST")
    user = _setting(values, "SMTP_USER")
    password = _setting(values, "SMTP_PASSWORD")
    sender = _setting(values, "PROACTIVE_EMAIL_FROM") or _setting(
        values, "SMTP_FROM"
    )
    reply_to = _setting(values, "SMTP_REPLY_TO")
    recipient = _setting(values, "PROACTIVE_EMAIL_TO")
    try:
        port = int(_setting(values, "SMTP_PORT", "587"))
    except (TypeError, ValueError):
        port = 0
    secure = _setting(values, "SMTP_SECURE").lower() in (
        "1",
        "true",
        "yes",
        "on",
    )
    require_tls = _setting(values, "SMTP_REQUIRE_TLS").lower() in (
        "1",
        "true",
        "yes",
        "on",
    )
    return {
        "host": host,
        "port": port,
        "secure": secure,
        "require_tls": require_tls,
        "user": user,
        "password": password,
        "sender": sender,
        "reply_to": reply_to,
        "recipient": recipient,
    }


def ensure_email_delivery_configured(env_file=None):
    config = load_email_config(env_file)
    missing = []
    for key in ("host", "sender", "recipient"):
        if not config[key]:
            missing.append(key)
    if config["port"] <= 0:
        missing.append("port")
    if bool(config["user"]) != bool(config["password"]):
        missing.append("SMTP_USER/SMTP_PASSWORD")
    if missing:
        raise EmailDeliveryError(
            "email delivery configuration incomplete: {}".format(
                ", ".join(missing)
            )
        )
    sender_name, sender_address = parseaddr(config["sender"])
    if not sender_address:
        raise EmailDeliveryError("email sender address is invalid")
    recipient_name, recipient_address = parseaddr(config["recipient"])
    if not recipient_address:
        raise EmailDeliveryError("email recipient address is invalid")
    config["sender_name"] = sender_name or "读写札记"
    config["sender_address"] = sender_address
    config["recipient_name"] = recipient_name
    config["recipient_address"] = recipient_address
    return config


def _message_id(idempotency_key):
    if not idempotency_key:
        return None
    digest = hashlib.sha256(str(idempotency_key).encode("utf-8")).hexdigest()[:24]
    return "<newblog-{}@kongyu204.com>".format(digest)


def _build_message(config, subject, body, idempotency_key=None):
    message = MIMEText(str(body or ""), "plain", "utf-8")
    message["Subject"] = str(Header(str(subject or "博客系统通知"), "utf-8"))
    message["From"] = formataddr(
        (str(Header(config["sender_name"], "utf-8")), config["sender_address"])
    )
    message["To"] = formataddr(
        (
            str(Header(config.get("recipient_name") or "", "utf-8")),
            config["recipient_address"],
        )
    )
    if config.get("reply_to"):
        message["Reply-To"] = config["reply_to"]
    message_id = _message_id(idempotency_key)
    if message_id:
        message["Message-ID"] = message_id
        message["X-NewBlog-Idempotency-Key"] = str(idempotency_key)
    return message


def _send_once(config, message, timeout):
    client = None
    try:
        context = ssl.create_default_context()
        if config["secure"]:
            client = smtplib.SMTP_SSL(
                config["host"], config["port"], timeout=timeout, context=context
            )
        else:
            client = smtplib.SMTP(config["host"], config["port"], timeout=timeout)
            client.ehlo()
            if config["require_tls"]:
                client.starttls(context=context)
                client.ehlo()
        if config["user"]:
            client.login(config["user"], config["password"])
        client.sendmail(
            config["sender_address"],
            [config["recipient_address"]],
            message.as_string(),
        )
    finally:
        if client is not None:
            try:
                client.quit()
            except Exception:
                try:
                    client.close()
                except Exception:
                    pass


def send_email(
    subject,
    body,
    idempotency_key=None,
    env_file=None,
    timeout=30,
    max_attempts=3,
    retry_seconds=10,
    logger=None,
):
    """Send one UTF-8 email with bounded retry and no secret in log output."""

    config = ensure_email_delivery_configured(env_file)
    message = _build_message(config, subject, body, idempotency_key)
    attempts = max(1, int(max_attempts or 1))
    delay = max(1, int(retry_seconds or 1))
    for attempt in range(1, attempts + 1):
        try:
            _send_once(config, message, max(3, int(timeout or 30)))
            if logger:
                logger(
                    "email delivered recipient={} subject={} attempt={}".format(
                        config["recipient_address"], str(subject or "")[:100], attempt
                    )
                )
            return attempt
        except (OSError, smtplib.SMTPException, ssl.SSLError) as exc:
            if attempt >= attempts:
                raise EmailDeliveryError(
                    "email delivery failed after {} attempt(s): {}".format(
                        attempts, str(exc)[:300]
                    )
                )
            if logger:
                logger(
                    "email delivery attempt {} failed; retrying in {}s: {}".format(
                        attempt, delay, str(exc)[:220]
                    )
                )
            time.sleep(delay)
            delay = min(300, delay * 2)
    raise EmailDeliveryError("email delivery failed")

