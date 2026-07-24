#!/usr/bin/env python3
"""Synchronize WeRead and send concise, data-backed Weixin briefings."""

from __future__ import print_function

import argparse
import datetime
import fcntl
import json
import os
import re
import shlex
import sqlite3
import subprocess
import sys
import tempfile


def utc_now():
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def local_date():
    return datetime.datetime.now().strftime("%Y-%m-%d")


def log(message):
    print("{} {}".format(utc_now(), message), flush=True)


def compact(value, limit=240):
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if len(text) <= limit:
        return text
    return text[: max(0, limit - 1)].rstrip() + "…"


def to_nonnegative_int(value):
    try:
        return max(0, int(value or 0))
    except (TypeError, ValueError):
        return 0


def atomic_write_json(path, value):
    directory = os.path.dirname(path)
    os.makedirs(directory, mode=0o700, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=".briefing-", dir=directory)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(value, handle, ensure_ascii=False, indent=2, sort_keys=True)
            handle.write("\n")
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def read_json(path, default):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, ValueError):
        return default


class BriefingConfig(object):
    def __init__(self):
        self.db_path = os.environ.get("NEWBLOG_DB_PATH", "").strip()
        self.container = os.environ.get("HERMES_CONTAINER", "hermes-agent").strip()
        self.target = os.environ.get("HERMES_WEIXIN_TARGET", "").strip()
        self.state_dir = os.environ.get(
            "READING_BRIEFING_STATE_DIR",
            "/var/lib/newblog-reading-briefing",
        ).strip()
        self.sync_command = os.environ.get(
            "READING_BRIEFING_SYNC_COMMAND",
            "/root/workspace/newblog/deploy/sync-weread.sh",
        ).strip()
        self.sync_timeout = max(
            60, int(os.environ.get("READING_BRIEFING_SYNC_TIMEOUT_SECONDS", "1800"))
        )
        self.model_timeout = max(
            30, int(os.environ.get("READING_BRIEFING_MODEL_TIMEOUT_SECONDS", "240"))
        )
        self.send_timeout = max(
            10, int(os.environ.get("READING_BRIEFING_SEND_TIMEOUT_SECONDS", "60"))
        )

        if not self.db_path:
            raise RuntimeError("NEWBLOG_DB_PATH is required")
        if not self.target.startswith("weixin:"):
            raise RuntimeError("HERMES_WEIXIN_TARGET must be a Weixin target")
        if not self.sync_command:
            raise RuntimeError("READING_BRIEFING_SYNC_COMMAND is required")

        self.snapshot_path = os.path.join(self.state_dir, "snapshot.json")
        self.delivery_path = os.path.join(self.state_dir, "delivery.json")
        self.lock_path = os.path.join(self.state_dir, "briefing.lock")

    def daily_path(self, day):
        return os.path.join(self.state_dir, "daily-{}.json".format(day))


def reading_seconds(row):
    candidates = [to_nonnegative_int(row["reading_seconds"])]
    try:
        payload = json.loads(row["raw_payload"] or "{}")
        book = ((payload.get("progress") or {}).get("book") or {})
        candidates.extend(
            [
                to_nonnegative_int(book.get("recordReadingTime")),
                to_nonnegative_int(book.get("readingTime")),
            ]
        )
    except (TypeError, ValueError):
        pass
    return max(candidates)


def load_snapshot(db_path):
    connection = sqlite3.connect(db_path, timeout=15)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA busy_timeout = 15000")
    try:
        books = {}
        for row in connection.execute(
            """
            SELECT source_id, title, author, status, progress, reading_seconds,
                   read_updated_at, raw_payload, is_private, archived_at
              FROM reading_books
            """
        ):
            books[row["source_id"]] = {
                "title": compact(row["title"], 160),
                "author": compact(row["author"], 100),
                "status": row["status"],
                "progress": to_nonnegative_int(row["progress"]),
                "readingSeconds": reading_seconds(row),
                "readUpdatedAt": row["read_updated_at"],
                "private": bool(row["is_private"]),
                "archived": bool(row["archived_at"]),
            }

        notes = {}
        for row in connection.execute(
            """
            SELECT source_id, book_source_id, type, content, abstract,
                   chapter_title, created_at
              FROM reading_notes
            """
        ):
            notes[row["source_id"]] = {
                "bookSourceId": row["book_source_id"],
                "type": row["type"],
                "content": compact(row["content"], 320),
                "thought": compact(row["abstract"], 240),
                "chapterTitle": compact(row["chapter_title"], 120),
                "createdAt": row["created_at"],
            }
        return {
            "capturedAt": utc_now(),
            "books": books,
            "notes": notes,
        }
    finally:
        connection.close()


def build_activity(before, after, day):
    previous_books = before.get("books", {})
    current_books = after.get("books", {})
    previous_notes = before.get("notes", {})
    current_notes = after.get("notes", {})
    changed_books = []
    finished_books = []
    new_books = []

    for source_id, book in current_books.items():
        if book.get("archived"):
            continue
        previous = previous_books.get(source_id)
        if previous is None:
            new_books.append(
                {
                    "title": book.get("title"),
                    "author": book.get("author"),
                    "progress": book.get("progress", 0),
                }
            )
            continue

        seconds_delta = max(
            0,
            to_nonnegative_int(book.get("readingSeconds"))
            - to_nonnegative_int(previous.get("readingSeconds")),
        )
        progress_delta = max(
            0,
            to_nonnegative_int(book.get("progress"))
            - to_nonnegative_int(previous.get("progress")),
        )
        read_updated = bool(
            book.get("readUpdatedAt")
            and book.get("readUpdatedAt") != previous.get("readUpdatedAt")
        )
        finished = (
            book.get("status") == "finished"
            and previous.get("status") != "finished"
        )

        if seconds_delta or progress_delta or read_updated or finished:
            changed_books.append(
                {
                    "sourceId": source_id,
                    "title": book.get("title"),
                    "author": book.get("author"),
                    "seconds": seconds_delta,
                    "minutes": int(round(seconds_delta / 60.0)),
                    "progressBefore": to_nonnegative_int(previous.get("progress")),
                    "progressAfter": to_nonnegative_int(book.get("progress")),
                    "progressDelta": progress_delta,
                    "readUpdated": read_updated,
                    "finished": finished,
                }
            )
        if finished:
            finished_books.append(book.get("title"))

    changed_books.sort(
        key=lambda item: (
            item["seconds"],
            item["progressDelta"],
            1 if item["readUpdated"] else 0,
        ),
        reverse=True,
    )

    added_notes = []
    for source_id, note in current_notes.items():
        if source_id in previous_notes:
            continue
        book = current_books.get(note.get("bookSourceId"), {})
        added_notes.append(
            {
                "type": note.get("type"),
                "book": book.get("title") or "未知书籍",
                "content": note.get("content"),
                "thought": note.get("thought"),
                "chapterTitle": note.get("chapterTitle"),
                "createdAt": note.get("createdAt"),
            }
        )
    added_notes.sort(key=lambda item: item.get("createdAt") or "", reverse=True)

    current_reading = [
        {
            "title": book.get("title"),
            "author": book.get("author"),
            "progress": book.get("progress", 0),
            "readUpdatedAt": book.get("readUpdatedAt"),
        }
        for book in current_books.values()
        if not book.get("archived") and book.get("status") == "reading"
    ]
    current_reading.sort(key=lambda item: item.get("readUpdatedAt") or "", reverse=True)

    total_seconds = sum(item["seconds"] for item in changed_books)
    meaningful_new_books = [
        item for item in new_books if to_nonnegative_int(item.get("progress")) > 0
    ]
    active = bool(
        total_seconds
        or any(item["progressDelta"] for item in changed_books)
        or any(item["readUpdated"] for item in changed_books)
        or added_notes
        or finished_books
        or meaningful_new_books
    )

    return {
        "date": day,
        "generatedAt": utc_now(),
        "active": active,
        "totalSeconds": total_seconds,
        "totalMinutes": int(round(total_seconds / 60.0)),
        "books": changed_books[:8],
        "notes": added_notes[:8],
        "finishedBooks": finished_books[:5],
        "newBooks": new_books[:5],
        "currentReading": current_reading[:6],
        "counts": {
            "changedBooks": len(changed_books),
            "newHighlights": sum(1 for item in added_notes if item["type"] == "highlight"),
            "newReviews": sum(1 for item in added_notes if item["type"] == "review"),
            "newBooks": len(new_books),
        },
    }


def run_command(command, timeout):
    completed = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=timeout,
    )
    stdout = completed.stdout.decode("utf-8", "replace").strip()
    stderr = completed.stderr.decode("utf-8", "replace").strip()
    if completed.returncode != 0:
        raise RuntimeError(compact(stderr or stdout or "command failed", 500))
    return stdout


def run_sync(config):
    command = shlex.split(config.sync_command)
    if not command:
        raise RuntimeError("The configured sync command is empty")
    return run_command(command, config.sync_timeout)


def run_hermes(config, prompt):
    command = [
        "docker",
        "exec",
        "-u",
        "hermes",
        config.container,
        "/opt/hermes/.venv/bin/hermes",
        "chat",
        "--source",
        "tool",
        "--max-turns",
        "2",
        "-Q",
        "-q",
        prompt,
    ]
    output = run_command(command, config.model_timeout)
    lines = [
        line
        for line in output.splitlines()
        if not line.strip().lower().startswith("session_id:")
    ]
    return compact("\n".join(lines), 1400)


def send_message(config, message):
    command = [
        "docker",
        "exec",
        "-i",
        "-u",
        "hermes",
        config.container,
        "/opt/hermes/.venv/bin/hermes",
        "send",
        "--to",
        config.target,
        "--file",
        "-",
        "--quiet",
    ]
    completed = subprocess.run(
        command,
        input=(message.strip() + "\n").encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=config.send_timeout,
    )
    if completed.returncode != 0:
        detail = completed.stderr.decode("utf-8", "replace").strip()
        if not detail:
            detail = completed.stdout.decode("utf-8", "replace").strip()
        raise RuntimeError(compact(detail or "Hermes send failed", 500))


def reading_prompt(activity):
    facts = json.dumps(activity, ensure_ascii=False, separators=(",", ":"))
    return (
        "你正在给主人通过微信发送今天的阅读小结。只依据下面的事实写中文，"
        "像熟悉他的朋友自然地说两到四句话，不要标题、列表、Markdown、数据报告口吻，"
        "不要自称 AI，也不要提到数据库或同步。可以提到阅读时长、读过的书、进度、"
        "新划线或感想，但只挑有意思的重点，不必逐项覆盖。若 active 为 false，"
        "温和地提醒他今天还没有读书，邀请他至少读十分钟，不要训诫。"
        "不得编造事实；totalMinutes 为 0 时不要声称具体时长。事实：{}".format(facts)
    )


def evening_prompt(activity):
    facts = json.dumps(activity, ensure_ascii=False, separators=(",", ":"))
    return (
        "现在是晚上十一点，请给主人发一段中文夜间消息。像一个有品位、了解他阅读"
        "兴趣的朋友，自然写两到四句话，不要标题、列表、Markdown，也不要自称 AI。"
        "可以从今天的阅读自然引出一个富有哲理或有趣的想法，也可以推荐一本相关或"
        "意外但值得读的书；每天不必使用固定结构。引用作者原话时必须确定出处，"
        "不确定就写成你自己的思考。不要编造今天发生的阅读行为。事实：{}".format(facts)
    )


def fallback_reading_message(activity):
    if not activity.get("active"):
        current = activity.get("currentReading") or []
        if current:
            return (
                "今天还没有看到新的阅读进度或摘记。要不要从《{}》继续，"
                "哪怕只读十分钟，也算给这一天留下一点安静的空白。"
            ).format(current[0]["title"])
        return (
            "今天还没有看到新的阅读记录。睡前给自己留十分钟翻几页书吧，"
            "不必追求读完，只要重新进入文字就很好。"
        )

    parts = []
    books = activity.get("books") or []
    if books:
        book = books[0]
        if book.get("minutes", 0) > 0:
            parts.append(
                "今天在《{}》里读了大约 {} 分钟".format(
                    book["title"], book["minutes"]
                )
            )
        elif book.get("progressDelta", 0) > 0:
            parts.append(
                "今天《{}》的进度从 {}% 走到了 {}%".format(
                    book["title"],
                    book["progressBefore"],
                    book["progressAfter"],
                )
            )
        else:
            parts.append("今天又翻开了《{}》".format(book["title"]))

    notes = activity.get("notes") or []
    if notes:
        note = notes[0]
        label = "写下的想法" if note.get("type") == "review" else "划下的一句"
        parts.append("{}很值得回味：“{}”".format(label, compact(note["content"], 90)))

    if not parts:
        return "今天有新的阅读足迹，书页正在一点点向前。保持这个节奏就很好。"
    return "；".join(parts) + "。不用赶，读进去比读得多更重要。"


def fallback_evening_message(activity):
    books = activity.get("books") or activity.get("currentReading") or []
    if books:
        title = books[0].get("title")
        return (
            "今晚想到一件事：一本书真正留下来的，往往不是结论，而是它改变了你"
            "看问题时的停顿方式。读《{}》时，不妨留意那个让你忽然慢下来的地方。"
        ).format(title)

    options = [
        "有些答案不是想出来的，而是在持续生活和阅读之后，慢慢变得不再需要追问。今晚可以随手翻开一本书，让偶然性替你选一条路。",
        "推荐你找时间读读《沉思录》。它不急着提供宏大的答案，只提醒人把注意力放回真正能够支配的事物。",
        "一个有趣的阅读方法：不要问这本书能教我什么，先问它正在挑战我的哪个习惯。问题换了，书也会显得不一样。",
        "推荐《悉达多》作为一次不赶时间的阅读。它谈寻找，却更像是在提醒人：有些经验无法由别人代替。",
    ]
    index = sum(ord(char) for char in activity.get("date", "")) % len(options)
    return options[index]


def generate_message(config, prompt, fallback):
    try:
        message = run_hermes(config, prompt)
        if message:
            return message
    except Exception as exc:
        log("Hermes generation failed; using fallback: {}".format(compact(exc, 300)))
    return fallback


def delivery_state(config):
    return read_json(config.delivery_path, {})


def mark_delivered(config, key, day):
    state = delivery_state(config)
    state[key] = day
    state["updatedAt"] = utc_now()
    atomic_write_json(config.delivery_path, state)


def handle_snapshot(config):
    snapshot = load_snapshot(config.db_path)
    atomic_write_json(config.snapshot_path, snapshot)
    print(
        json.dumps(
            {
                "ok": True,
                "books": len(snapshot["books"]),
                "notes": len(snapshot["notes"]),
                "capturedAt": snapshot["capturedAt"],
            },
            ensure_ascii=False,
        )
    )


def handle_sync_report(config, force=False, no_send=False):
    day = local_date()
    state = delivery_state(config)
    daily_path = config.daily_path(day)
    activity = read_json(daily_path, None)

    if state.get("readingReportDate") == day and not force:
        log("reading report already delivered for {}".format(day))
        return

    if activity is None or force:
        before = read_json(config.snapshot_path, None)
        if before is None:
            before = load_snapshot(config.db_path)
            log("no prior snapshot found; using current database as baseline")

        try:
            output = run_sync(config)
            log("WeRead sync completed: {}".format(compact(output, 300)))
        except Exception as exc:
            log("WeRead sync failed: {}".format(compact(exc, 500)))
            if not no_send:
                try:
                    send_message(
                        config,
                        "今天的书架同步没有顺利完成，所以暂时不能给你一份准确的阅读小结。"
                        "我已经把错误记下来了，下次会继续重试。",
                    )
                except Exception as send_error:
                    log("sync failure notification failed: {}".format(send_error))
            raise

        after = load_snapshot(config.db_path)
        activity = build_activity(before, after, day)
        atomic_write_json(config.snapshot_path, after)
        atomic_write_json(daily_path, activity)

    message = generate_message(
        config,
        reading_prompt(activity),
        fallback_reading_message(activity),
    )
    if no_send:
        print(message)
        return
    send_message(config, message)
    mark_delivered(config, "readingReportDate", day)
    log("reading report delivered for {}".format(day))


def handle_evening(config, force=False, no_send=False):
    day = local_date()
    state = delivery_state(config)
    if state.get("eveningMessageDate") == day and not force:
        log("evening message already delivered for {}".format(day))
        return

    activity = read_json(
        config.daily_path(day),
        {
            "date": day,
            "active": False,
            "totalMinutes": 0,
            "books": [],
            "notes": [],
            "currentReading": [],
            "counts": {},
        },
    )
    message = generate_message(
        config,
        evening_prompt(activity),
        fallback_evening_message(activity),
    )
    if no_send:
        print(message)
        return
    send_message(config, message)
    mark_delivered(config, "eveningMessageDate", day)
    log("evening message delivered for {}".format(day))


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "command",
        choices=["snapshot", "sync-report", "evening"],
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Run even when today's message was already delivered.",
    )
    parser.add_argument(
        "--no-send",
        action="store_true",
        help="Generate and print the message without delivering it.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    config = BriefingConfig()
    os.makedirs(config.state_dir, mode=0o700, exist_ok=True)
    lock_handle = open(config.lock_path, "a+")
    try:
        fcntl.flock(lock_handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        log("another reading briefing process is already running")
        return 0

    try:
        if args.command == "snapshot":
            handle_snapshot(config)
        elif args.command == "sync-report":
            handle_sync_report(config, force=args.force, no_send=args.no_send)
        else:
            handle_evening(config, force=args.force, no_send=args.no_send)
    finally:
        fcntl.flock(lock_handle.fileno(), fcntl.LOCK_UN)
        lock_handle.close()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        log("fatal: {}".format(compact(exc, 500)))
        sys.exit(1)
