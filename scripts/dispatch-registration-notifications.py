#!/usr/bin/env python3
"""Deliver queued blog registration notifications through Hermes Weixin."""

from __future__ import print_function

import datetime
import os
import signal
import sqlite3
import subprocess
import sys
import time


RUNNING = True


def utc_now():
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def utc_before(seconds):
    value = datetime.datetime.utcnow() - datetime.timedelta(seconds=seconds)
    return value.replace(microsecond=0).isoformat() + "Z"


def stop(_signum, _frame):
    global RUNNING
    RUNNING = False


def log(message):
    print("{} {}".format(utc_now(), message), flush=True)


class RegistrationNotifier(object):
    def __init__(self):
        self.db_path = os.environ.get("NEWBLOG_DB_PATH", "").strip()
        self.container = os.environ.get("HERMES_CONTAINER", "hermes-agent").strip()
        self.target = os.environ.get("HERMES_WEIXIN_TARGET", "").strip()
        self.poll_seconds = max(
            2, int(os.environ.get("NOTIFIER_POLL_SECONDS", "5"))
        )
        self.claim_timeout = max(
            60, int(os.environ.get("NOTIFIER_CLAIM_TIMEOUT_SECONDS", "300"))
        )
        self.command_timeout = max(
            10, int(os.environ.get("NOTIFIER_COMMAND_TIMEOUT_SECONDS", "45"))
        )

        if not self.db_path:
            raise RuntimeError("NEWBLOG_DB_PATH is required")
        if not self.target.startswith("weixin:"):
            raise RuntimeError("HERMES_WEIXIN_TARGET must be a Weixin target")

    def connect(self):
        connection = sqlite3.connect(self.db_path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA busy_timeout = 10000")
        return connection

    def recover_stale_claims(self, connection):
        connection.execute(
            """
            UPDATE user_registration_notifications
               SET status = 'retry',
                   next_attempt_at = ?,
                   claimed_at = NULL,
                   last_error = 'Recovered stale dispatcher claim'
             WHERE status = 'processing'
               AND claimed_at IS NOT NULL
               AND claimed_at <= ?
            """,
            (utc_now(), utc_before(self.claim_timeout)),
        )
        connection.commit()

    def claim_one(self):
        connection = self.connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            now = utc_now()
            row = connection.execute(
                """
                SELECT id, user_id, email, display_name, attempts, created_at
                  FROM user_registration_notifications
                 WHERE status IN ('pending', 'retry')
                   AND next_attempt_at <= ?
                 ORDER BY created_at ASC, id ASC
                 LIMIT 1
                """,
                (now,),
            ).fetchone()
            if row is None:
                connection.commit()
                return None

            changed = connection.execute(
                """
                UPDATE user_registration_notifications
                   SET status = 'processing',
                       attempts = attempts + 1,
                       claimed_at = ?,
                       last_error = NULL
                 WHERE id = ?
                   AND status IN ('pending', 'retry')
                """,
                (now, row["id"]),
            ).rowcount
            connection.commit()
            if changed != 1:
                return None
            return dict(row)
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def mark_sent(self, notification_id):
        connection = self.connect()
        try:
            connection.execute(
                """
                UPDATE user_registration_notifications
                   SET status = 'sent',
                       sent_at = ?,
                       claimed_at = NULL,
                       last_error = NULL
                 WHERE id = ? AND status = 'processing'
                """,
                (utc_now(), notification_id),
            )
            connection.commit()
        finally:
            connection.close()

    def mark_retry(self, notification_id, attempts, error):
        delay_seconds = min(3600, 30 * (2 ** min(max(attempts, 0), 7)))
        next_attempt = (
            datetime.datetime.utcnow() + datetime.timedelta(seconds=delay_seconds)
        ).replace(microsecond=0).isoformat() + "Z"
        connection = self.connect()
        try:
            connection.execute(
                """
                UPDATE user_registration_notifications
                   SET status = 'retry',
                       next_attempt_at = ?,
                       claimed_at = NULL,
                       last_error = ?
                 WHERE id = ? AND status = 'processing'
                """,
                (next_attempt, error[:500], notification_id),
            )
            connection.commit()
        finally:
            connection.close()

    def send(self, row):
        message = (
            "博客有一位新用户完成邮箱注册。\n\n"
            "昵称：{display_name}\n"
            "邮箱：{email}\n"
            "注册时间：{created_at}\n"
            "用户 ID：{user_id}\n\n"
            "你可以回复我查询用户列表，或在明确确认后调整该用户的角色与状态。"
        ).format(**row)
        command = [
            "docker",
            "exec",
            "-i",
            self.container,
            "hermes",
            "send",
            "--to",
            self.target,
            "--subject",
            "博客新用户注册",
            "--file",
            "-",
            "--quiet",
        ]
        completed = subprocess.run(
            command,
            input=message.encode("utf-8"),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=self.command_timeout,
        )
        if completed.returncode != 0:
            detail = completed.stderr.decode("utf-8", "replace").strip()
            if not detail:
                detail = completed.stdout.decode("utf-8", "replace").strip()
            raise RuntimeError(detail or "Hermes send command failed")

    def run(self):
        connection = self.connect()
        try:
            self.recover_stale_claims(connection)
        finally:
            connection.close()

        log("registration notifier started")
        while RUNNING:
            try:
                row = self.claim_one()
                if row is None:
                    time.sleep(self.poll_seconds)
                    continue
                try:
                    self.send(row)
                    self.mark_sent(row["id"])
                    log("sent registration notification id={}".format(row["id"]))
                except Exception as exc:
                    attempts = int(row.get("attempts") or 0) + 1
                    self.mark_retry(row["id"], attempts, str(exc))
                    log(
                        "delivery failed id={} error={}".format(
                            row["id"], str(exc)[:200]
                        )
                    )
            except sqlite3.OperationalError as exc:
                log("database unavailable: {}".format(str(exc)[:200]))
                time.sleep(self.poll_seconds)
            except Exception as exc:
                log("dispatcher error: {}".format(str(exc)[:200]))
                time.sleep(self.poll_seconds)
        log("registration notifier stopped")


def main():
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        RegistrationNotifier().run()
    except Exception as exc:
        log("fatal: {}".format(str(exc)[:500]))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
