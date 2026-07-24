#!/usr/bin/env python3
"""Collect server health checks and notify the owner through Hermes Weixin."""

from __future__ import print_function

import datetime
import fcntl
import json
import os
import shlex
import shutil
import smtplib
import socket
import sqlite3
import ssl
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request


STATUS_RANK = {
    "healthy": 0,
    "unknown": 1,
    "warning": 2,
    "critical": 3,
}


def utc_now():
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def local_now():
    return datetime.datetime.now()


def compact(value, limit=320):
    text = " ".join(str(value or "").split())
    if len(text) <= limit:
        return text
    return text[: max(0, limit - 1)].rstrip() + "…"


def log(message):
    print("{} {}".format(utc_now(), message), flush=True)


def read_json(path, default):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, ValueError):
        return default


def atomic_write_json(path, value, mode):
    directory = os.path.dirname(path)
    os.makedirs(directory, mode=0o700, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=".health-", dir=directory)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(value, handle, ensure_ascii=False, indent=2, sort_keys=True)
            handle.write("\n")
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def parse_env_file(path):
    values = {}
    try:
        with open(path, "r", encoding="utf-8") as handle:
            lines = handle.readlines()
    except OSError:
        return values

    for raw in lines:
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        try:
            parts = shlex.split(value, comments=False, posix=True)
            parsed = parts[0] if len(parts) == 1 else value
        except ValueError:
            parsed = value.strip("'\"")
        values[key.strip()] = parsed
    return values


def run(command, timeout=20):
    completed = subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=timeout,
    )
    stdout = completed.stdout.decode("utf-8", "replace").strip()
    stderr = completed.stderr.decode("utf-8", "replace").strip()
    if completed.returncode != 0:
        raise RuntimeError(compact(stderr or stdout or "command failed"))
    return stdout


def make_check(check_id, group, status, title, summary, **extra):
    result = {
        "id": check_id,
        "group": group,
        "status": status,
        "title": title,
        "summary": compact(summary),
        "checkedAt": utc_now(),
    }
    for key, value in extra.items():
        if value is not None:
            result[key] = value
    return result


class MonitorConfig(object):
    def __init__(self):
        self.repo_root = os.environ.get(
            "NEWBLOG_REPO_ROOT", "/root/workspace/newblog"
        ).strip()
        self.db_path = os.environ.get(
            "NEWBLOG_DB_PATH", os.path.join(self.repo_root, "data", "blog.db")
        ).strip()
        self.snapshot_path = os.environ.get(
            "NEWBLOG_HEALTH_SNAPSHOT",
            os.path.join(self.repo_root, "data", "system-health.json"),
        ).strip()
        self.state_dir = os.environ.get(
            "NEWBLOG_HEALTH_STATE_DIR", "/var/lib/newblog-health-monitor"
        ).strip()
        self.site_url = os.environ.get(
            "NEWBLOG_SITE_URL", "https://blog.kongyu204.com"
        ).rstrip("/")
        self.hermes_container = os.environ.get(
            "HERMES_CONTAINER", "hermes-agent"
        ).strip()
        self.weixin_target = os.environ.get("HERMES_WEIXIN_TARGET", "").strip()
        self.repeat_alert_seconds = max(
            3600, int(os.environ.get("HEALTH_ALERT_REPEAT_SECONDS", "21600"))
        )
        self.smtp_cache_seconds = max(
            300, int(os.environ.get("HEALTH_SMTP_CACHE_SECONDS", "1800"))
        )
        self.timeout = max(3, int(os.environ.get("HEALTH_CHECK_TIMEOUT_SECONDS", "12")))
        self.deploy_env_path = os.path.join(
            self.repo_root, "deploy", ".env.production"
        )
        self.hermes_env_path = "/opt/hermes/data/.env"
        self.hermes_config_path = "/opt/hermes/data/config.yaml"
        self.gateway_state_path = "/opt/hermes/data/gateway_state.json"
        self.briefing_delivery_path = (
            "/var/lib/newblog-reading-briefing/delivery.json"
        )
        self.alert_state_path = os.path.join(self.state_dir, "state.json")
        self.smtp_cache_path = os.path.join(self.state_dir, "smtp-cache.json")
        self.lock_path = os.path.join(self.state_dir, "monitor.lock")

        if not self.weixin_target.startswith("weixin:"):
            raise RuntimeError("HERMES_WEIXIN_TARGET must be configured")


def check_container(name, require_health=False):
    try:
        raw = run(["docker", "inspect", name], timeout=15)
        payload = json.loads(raw)[0]
        state = payload.get("State") or {}
        running = bool(state.get("Running"))
        health = (state.get("Health") or {}).get("Status")
        healthy = running and (not require_health or health == "healthy")
        if healthy:
            summary = "容器运行中"
            if health:
                summary += "，健康检查为 {}".format(health)
            return "healthy", summary, {"running": running, "health": health}
        summary = "容器未正常运行"
        if health:
            summary += "，健康检查为 {}".format(health)
        return "critical", summary, {"running": running, "health": health}
    except Exception as exc:
        return "critical", "无法读取容器状态：{}".format(compact(exc)), {}


def http_probe(url, contains=None, timeout=12):
    started = time.time()
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "newblog-health-monitor/1.0"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read(256 * 1024)
            status_code = int(response.getcode())
        latency_ms = int(round((time.time() - started) * 1000))
        text = body.decode("utf-8", "replace")
        if status_code != 200:
            return "critical", "HTTP {}".format(status_code), latency_ms
        if contains and contains not in text:
            return "warning", "响应成功，但内容特征不符合预期", latency_ms
        return "healthy", "HTTP 200，耗时 {} ms".format(latency_ms), latency_ms
    except Exception as exc:
        latency_ms = int(round((time.time() - started) * 1000))
        return "critical", "请求失败：{}".format(compact(exc)), latency_ms


def check_database(config):
    try:
        connection = sqlite3.connect(config.db_path, timeout=15)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA busy_timeout = 15000")
        integrity = connection.execute("PRAGMA quick_check").fetchone()[0]
        user_count = connection.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        post_count = connection.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
        connection.close()
        if integrity != "ok":
            return make_check(
                "database",
                "application",
                "critical",
                "数据库",
                "SQLite 完整性检查失败：{}".format(compact(integrity)),
            )
        return make_check(
            "database",
            "application",
            "healthy",
            "数据库",
            "数据库可读，完整性检查通过",
            metrics={"users": user_count, "posts": post_count},
        )
    except Exception as exc:
        return make_check(
            "database",
            "application",
            "critical",
            "数据库",
            "数据库检查失败：{}".format(compact(exc)),
        )


def smtp_check(config):
    cached = read_json(config.smtp_cache_path, {})
    checked_epoch = float(cached.get("checkedEpoch") or 0)
    if time.time() - checked_epoch < config.smtp_cache_seconds:
        return make_check(
            "smtp_delivery",
            "application",
            cached.get("status", "unknown"),
            "邮箱注册",
            cached.get("summary", "等待 SMTP 检查"),
            metrics={"cached": True},
        )

    env = parse_env_file(config.deploy_env_path)
    host = env.get("SMTP_HOST", "").strip()
    user = env.get("SMTP_USER", "").strip()
    password = env.get("SMTP_PASSWORD", "").strip()
    from_address = env.get("SMTP_FROM", "").strip()
    try:
        port = int(env.get("SMTP_PORT", "587"))
    except ValueError:
        port = 0
    secure = env.get("SMTP_SECURE", "").lower() in ("1", "true", "yes", "on")
    require_tls = env.get("SMTP_REQUIRE_TLS", "").lower() in (
        "1",
        "true",
        "yes",
        "on",
    )

    if not host or not from_address or port <= 0 or bool(user) != bool(password):
        status = "critical"
        summary = "SMTP 配置不完整"
    else:
        client = None
        try:
            context = ssl.create_default_context()
            if secure:
                client = smtplib.SMTP_SSL(
                    host, port, timeout=config.timeout, context=context
                )
            else:
                client = smtplib.SMTP(host, port, timeout=config.timeout)
                client.ehlo()
                if require_tls:
                    client.starttls(context=context)
                    client.ehlo()
            if user:
                client.login(user, password)
            code, _ = client.noop()
            if int(code) >= 400:
                raise RuntimeError("SMTP NOOP returned {}".format(code))
            status = "healthy"
            summary = "SMTP 连接、TLS 与登录验证通过"
        except Exception as exc:
            status = "critical"
            summary = "SMTP 验证失败：{}".format(compact(exc))
        finally:
            if client is not None:
                try:
                    client.quit()
                except Exception:
                    pass

    cache = {
        "checkedEpoch": time.time(),
        "status": status,
        "summary": summary,
    }
    atomic_write_json(config.smtp_cache_path, cache, 0o600)
    return make_check(
        "smtp_delivery",
        "application",
        status,
        "邮箱注册",
        summary,
        metrics={"cached": False},
    )


def check_registration_notifications(config):
    service_active = False
    try:
        service_active = (
            run(
                [
                    "systemctl",
                    "is-active",
                    "newblog-registration-notifier.service",
                ],
                timeout=10,
            )
            == "active"
        )
    except Exception:
        service_active = False

    try:
        connection = sqlite3.connect(config.db_path, timeout=10)
        row = connection.execute(
            """
            SELECT
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END),
              SUM(CASE WHEN status = 'retry' THEN 1 ELSE 0 END),
              SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END),
              MIN(CASE WHEN status IN ('pending', 'retry') THEN created_at END)
            FROM user_registration_notifications
            """
        ).fetchone()
        connection.close()
        pending, retry, processing, oldest = row
        pending = int(pending or 0)
        retry = int(retry or 0)
        processing = int(processing or 0)
    except Exception as exc:
        return make_check(
            "registration_notifications",
            "automation",
            "critical",
            "注册主动通知",
            "通知队列检查失败：{}".format(compact(exc)),
        )

    if not service_active:
        status = "critical"
        summary = "注册通知服务未运行"
    elif retry > 0:
        status = "warning"
        summary = "服务运行中，但有 {} 条通知等待重试".format(retry)
    else:
        status = "healthy"
        summary = "服务运行中，通知队列无异常积压"
    return make_check(
        "registration_notifications",
        "automation",
        status,
        "注册主动通知",
        summary,
        metrics={
            "pending": pending,
            "retry": retry,
            "processing": processing,
            "oldestPendingAt": oldest,
        },
    )


def check_weread(config):
    timer_active = False
    try:
        timer_active = (
            run(["systemctl", "is-active", "newblog-weread-sync.timer"], timeout=10)
            == "active"
        )
    except Exception:
        pass

    try:
        connection = sqlite3.connect(config.db_path, timeout=10)
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            """
            SELECT status, message, total_books, total_notes, finished_at
              FROM reading_sync_state
             WHERE key = 'weread'
            """
        ).fetchone()
        connection.close()
    except Exception as exc:
        return make_check(
            "weread_sync",
            "automation",
            "critical",
            "微信读书同步",
            "同步状态读取失败：{}".format(compact(exc)),
        )

    if row is None:
        status = "warning"
        summary = "尚无微信读书同步记录"
        metrics = {"timerActive": timer_active}
    else:
        finished_at = row["finished_at"]
        age_hours = None
        if finished_at:
            try:
                normalized = finished_at[:-1] if finished_at.endswith("Z") else finished_at
                if "." in normalized:
                    normalized = normalized.split(".", 1)[0]
                finished = datetime.datetime.strptime(
                    normalized,
                    "%Y-%m-%dT%H:%M:%S",
                )
                age_hours = (
                    datetime.datetime.utcnow() - finished
                ).total_seconds() / 3600.0
            except ValueError:
                age_hours = None

        if not timer_active or row["status"] == "error":
            status = "critical"
        elif age_hours is not None and age_hours > 30:
            status = "warning"
        else:
            status = "healthy"

        if row["status"] == "error":
            summary = "最近一次同步失败：{}".format(compact(row["message"]))
        elif not timer_active:
            summary = "18:00 同步定时器未运行"
        elif age_hours is not None and age_hours > 30:
            summary = "最近成功同步距今 {:.1f} 小时".format(age_hours)
        else:
            summary = "最近同步成功，18:00 定时器运行中"
        metrics = {
            "timerActive": timer_active,
            "lastStatus": row["status"],
            "finishedAt": finished_at,
            "books": int(row["total_books"] or 0),
            "notes": int(row["total_notes"] or 0),
        }

    return make_check(
        "weread_sync",
        "automation",
        status,
        "微信读书同步",
        summary,
        metrics=metrics,
    )


def hermes_api(config):
    env = parse_env_file(config.hermes_env_path)
    api_key = env.get("PACKYCODE_API_KEY", "")
    endpoint = ""
    try:
        with open(config.hermes_config_path, "r", encoding="utf-8") as handle:
            for raw in handle:
                stripped = raw.strip()
                if stripped.startswith("api:"):
                    endpoint = stripped.split(":", 1)[1].strip()
                    break
    except OSError:
        pass
    if not endpoint or not api_key:
        return False, "模型接口配置不完整", None

    url = endpoint.rstrip("/") + "/models"
    request = urllib.request.Request(
        url,
        headers={
            "Authorization": "Bearer {}".format(api_key),
            "User-Agent": "newblog-health-monitor/1.0",
        },
    )
    started = time.time()
    try:
        with urllib.request.urlopen(request, timeout=config.timeout) as response:
            payload = json.loads(response.read(512 * 1024).decode("utf-8"))
        latency_ms = int(round((time.time() - started) * 1000))
        model_count = len(payload.get("data") or [])
        return True, "模型接口可用，{} 个模型，{} ms".format(
            model_count, latency_ms
        ), {"models": model_count, "latencyMs": latency_ms}
    except Exception as exc:
        return False, "模型接口请求失败：{}".format(compact(exc)), None


def check_hermes(config):
    container_status, container_summary, container_metrics = check_container(
        config.hermes_container
    )
    gateway = read_json(config.gateway_state_path, {})
    gateway_running = gateway.get("gateway_state") == "running"
    weixin_state = (
        ((gateway.get("platforms") or {}).get("weixin") or {}).get("state")
    )
    api_ok, api_summary, api_metrics = hermes_api(config)

    if container_status == "critical" or not gateway_running or weixin_state != "connected":
        status = "critical"
    elif not api_ok:
        status = "warning"
    else:
        status = "healthy"

    if container_status == "critical":
        summary = container_summary
    elif not gateway_running:
        summary = "Hermes 网关未运行"
    elif weixin_state != "connected":
        summary = "微信通道状态为 {}".format(weixin_state or "unknown")
    else:
        summary = "微信通道已连接；{}".format(api_summary)

    metrics = dict(container_metrics)
    metrics.update(
        {
            "gatewayRunning": gateway_running,
            "weixinState": weixin_state,
        }
    )
    if api_metrics:
        metrics.update(api_metrics)
    return make_check(
        "hermes_gateway",
        "automation",
        status,
        "Hermes 与微信",
        summary,
        metrics=metrics,
    )


def check_proactive_push(config):
    report_timer = evening_timer = False
    try:
        report_timer = (
            run(["systemctl", "is-active", "newblog-weread-sync.timer"], timeout=10)
            == "active"
        )
    except Exception:
        pass
    try:
        evening_timer = (
            run(
                ["systemctl", "is-active", "newblog-evening-reading.timer"],
                timeout=10,
            )
            == "active"
        )
    except Exception:
        pass

    delivery = read_json(config.briefing_delivery_path, {})
    report_date = delivery.get("readingReportDate")
    evening_date = delivery.get("eveningMessageDate")
    if not report_timer or not evening_timer:
        status = "critical"
        summary = "一个或多个主动推送定时器未运行"
    elif not report_date:
        status = "unknown"
        summary = "定时器运行中，等待首次阅读汇报"
    elif not evening_date:
        status = "unknown"
        summary = "18:00 汇报已记录，等待首次 23:00 推送"
    else:
        status = "healthy"
        summary = "18:00 与 23:00 主动推送定时器均运行中"
    return make_check(
        "proactive_push",
        "automation",
        status,
        "Hermes 主动推送",
        summary,
        metrics={
            "reportTimerActive": report_timer,
            "eveningTimerActive": evening_timer,
            "lastReadingReportDate": report_date,
            "lastEveningMessageDate": evening_date,
        },
    )


def check_tls(hostname, port=443, timeout=12):
    try:
        context = ssl.create_default_context()
        raw_socket = socket.create_connection((hostname, port), timeout=timeout)
        try:
            tls_socket = context.wrap_socket(raw_socket, server_hostname=hostname)
            try:
                certificate = tls_socket.getpeercert()
            finally:
                tls_socket.close()
        except Exception:
            raw_socket.close()
            raise
        expires_epoch = ssl.cert_time_to_seconds(certificate["notAfter"])
        days = int((expires_epoch - time.time()) // 86400)
        expires_at = datetime.datetime.utcfromtimestamp(expires_epoch).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
        if days < 7:
            status = "critical"
        elif days < 21:
            status = "warning"
        else:
            status = "healthy"
        return make_check(
            "tls_certificate",
            "infrastructure",
            status,
            "HTTPS 证书",
            "证书剩余 {} 天".format(days),
            metrics={"daysRemaining": days, "expiresAt": expires_at},
        )
    except Exception as exc:
        return make_check(
            "tls_certificate",
            "infrastructure",
            "critical",
            "HTTPS 证书",
            "证书检查失败：{}".format(compact(exc)),
        )


def check_disk(path):
    try:
        usage = shutil.disk_usage(path)
        free_percent = (usage.free / float(usage.total)) * 100
        used_percent = 100 - free_percent
        if free_percent < 10:
            status = "critical"
        elif free_percent < 20:
            status = "warning"
        else:
            status = "healthy"
        return make_check(
            "disk_space",
            "infrastructure",
            status,
            "磁盘空间",
            "已使用 {:.1f}%，剩余 {:.1f} GB".format(
                used_percent, usage.free / float(1024 ** 3)
            ),
            metrics={
                "usedPercent": round(used_percent, 1),
                "freeBytes": int(usage.free),
                "totalBytes": int(usage.total),
            },
        )
    except Exception as exc:
        return make_check(
            "disk_space",
            "infrastructure",
            "critical",
            "磁盘空间",
            "磁盘检查失败：{}".format(compact(exc)),
        )


def check_memory():
    try:
        values = {}
        with open("/proc/meminfo", "r", encoding="utf-8") as handle:
            for raw in handle:
                key, value = raw.split(":", 1)
                values[key] = int(value.strip().split()[0]) * 1024
        total = values["MemTotal"]
        available = values["MemAvailable"]
        available_percent = (available / float(total)) * 100
        if available_percent < 8:
            status = "critical"
        elif available_percent < 15:
            status = "warning"
        else:
            status = "healthy"
        return make_check(
            "memory",
            "infrastructure",
            status,
            "内存",
            "可用 {:.1f}%，约 {:.1f} GB".format(
                available_percent, available / float(1024 ** 3)
            ),
            metrics={
                "availablePercent": round(available_percent, 1),
                "availableBytes": available,
                "totalBytes": total,
            },
        )
    except Exception as exc:
        return make_check(
            "memory",
            "infrastructure",
            "warning",
            "内存",
            "内存检查失败：{}".format(compact(exc)),
        )


def check_backups(config):
    backup_dir = os.path.join(config.repo_root, "data", "backups")
    latest_path = None
    latest_mtime = 0
    try:
        for name in os.listdir(backup_dir):
            path = os.path.join(backup_dir, name)
            if not os.path.isfile(path):
                continue
            mtime = os.path.getmtime(path)
            if mtime > latest_mtime:
                latest_mtime = mtime
                latest_path = path
    except OSError:
        pass

    if not latest_path:
        return make_check(
            "backups",
            "infrastructure",
            "warning",
            "数据备份",
            "未发现可用备份",
        )

    age_days = (time.time() - latest_mtime) / 86400.0
    if age_days > 14:
        status = "critical"
    elif age_days > 7:
        status = "warning"
    else:
        status = "healthy"
    return make_check(
        "backups",
        "infrastructure",
        status,
        "数据备份",
        "最近备份距今 {:.1f} 天".format(age_days),
        metrics={
            "ageDays": round(age_days, 1),
            "latestAt": datetime.datetime.utcfromtimestamp(latest_mtime)
            .replace(microsecond=0)
            .isoformat()
            + "Z",
        },
    )


def collect_checks(config):
    checks = []

    app_status, app_summary, app_metrics = check_container(
        "blog-app", require_health=True
    )
    checks.append(
        make_check(
            "app_container",
            "application",
            app_status,
            "博客应用",
            app_summary,
            metrics=app_metrics,
        )
    )

    nginx_status, nginx_summary, nginx_metrics = check_container("blog-nginx")
    checks.append(
        make_check(
            "nginx_container",
            "application",
            nginx_status,
            "Web 入口",
            nginx_summary,
            metrics=nginx_metrics,
        )
    )

    health_status, health_summary, health_latency = http_probe(
        config.site_url + "/healthz",
        contains='"status":"ok"',
        timeout=config.timeout,
    )
    checks.append(
        make_check(
            "site_https",
            "application",
            health_status,
            "公网访问",
            health_summary,
            metrics={"latencyMs": health_latency},
        )
    )

    rss_status, rss_summary, rss_latency = http_probe(
        config.site_url + "/feed.xml",
        contains="<rss",
        timeout=config.timeout,
    )
    checks.append(
        make_check(
            "rss_feed",
            "application",
            rss_status,
            "RSS",
            rss_summary,
            metrics={"latencyMs": rss_latency},
        )
    )

    checks.extend(
        [
            check_database(config),
            smtp_check(config),
            check_registration_notifications(config),
            check_weread(config),
            check_hermes(config),
            check_proactive_push(config),
            check_tls("blog.kongyu204.com", timeout=config.timeout),
            check_disk(config.repo_root),
            check_memory(),
            check_backups(config),
        ]
    )
    return checks


def overall_status(checks):
    statuses = [check["status"] for check in checks]
    if "critical" in statuses:
        return "critical"
    if "warning" in statuses:
        return "degraded"
    return "healthy"


def send_alert(config, message):
    command = [
        "docker",
        "exec",
        "-i",
        "-u",
        "hermes",
        config.hermes_container,
        "/opt/hermes/.venv/bin/hermes",
        "send",
        "--to",
        config.weixin_target,
        "--file",
        "-",
        "--quiet",
    ]
    completed = subprocess.run(
        command,
        input=(message.strip() + "\n").encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=60,
    )
    if completed.returncode != 0:
        detail = completed.stderr.decode("utf-8", "replace").strip()
        if not detail:
            detail = completed.stdout.decode("utf-8", "replace").strip()
        raise RuntimeError(compact(detail or "Hermes send failed"))


def alert_message(problems, recoveries):
    parts = []
    if problems:
        details = "；".join(
            "{}：{}".format(item["title"], item["summary"]) for item in problems[:6]
        )
        parts.append(
            "服务监测发现 {} 项需要处理的问题：{}。我会继续监测状态变化。".format(
                len(problems), details
            )
        )
    if recoveries:
        names = "、".join(item["title"] for item in recoveries[:8])
        parts.append("{}已恢复正常。".format(names))
    return "\n".join(parts)


def process_alerts(config, checks):
    state = read_json(config.alert_state_path, {"checks": {}})
    previous_checks = state.get("checks") or {}
    now_epoch = time.time()
    problems = []
    recoveries = []

    for check in checks:
        check_id = check["id"]
        current_status = check["status"]
        previous = previous_checks.get(check_id) or {}
        previous_status = previous.get("status", "unknown")
        last_alert = float(previous.get("lastAlertEpoch") or 0)
        is_problem = current_status in ("warning", "critical")
        was_problem = previous_status in ("warning", "critical")
        should_repeat = (
            is_problem
            and was_problem
            and now_epoch - last_alert >= config.repeat_alert_seconds
        )

        if is_problem and (
            not was_problem
            or STATUS_RANK[current_status] > STATUS_RANK.get(previous_status, 0)
            or should_repeat
        ):
            problems.append(check)
        elif was_problem and current_status == "healthy":
            recoveries.append(check)

    if problems or recoveries:
        message = alert_message(problems, recoveries)
        send_alert(config, message)
        alerted_ids = {item["id"] for item in problems}
    else:
        alerted_ids = set()

    next_checks = {}
    for check in checks:
        previous = previous_checks.get(check["id"]) or {}
        next_checks[check["id"]] = {
            "status": check["status"],
            "lastChangedAt": (
                utc_now()
                if previous.get("status") != check["status"]
                else previous.get("lastChangedAt", utc_now())
            ),
            "lastAlertEpoch": (
                now_epoch
                if check["id"] in alerted_ids
                else previous.get("lastAlertEpoch", 0)
            ),
        }
    atomic_write_json(
        config.alert_state_path,
        {"updatedAt": utc_now(), "checks": next_checks},
        0o600,
    )


def main():
    config = MonitorConfig()
    os.makedirs(config.state_dir, mode=0o700, exist_ok=True)
    lock_handle = open(config.lock_path, "a+")
    try:
        fcntl.flock(lock_handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        log("another health monitor process is already running")
        return 0

    try:
        checks = collect_checks(config)
        snapshot = {
            "schemaVersion": 1,
            "service": "newblog-server-monitor",
            "overall": overall_status(checks),
            "generatedAt": utc_now(),
            "checks": checks,
            "counts": {
                "healthy": sum(1 for item in checks if item["status"] == "healthy"),
                "warning": sum(1 for item in checks if item["status"] == "warning"),
                "critical": sum(1 for item in checks if item["status"] == "critical"),
                "unknown": sum(1 for item in checks if item["status"] == "unknown"),
            },
        }
        atomic_write_json(config.snapshot_path, snapshot, 0o644)
        try:
            process_alerts(config, checks)
        except Exception as exc:
            log("alert delivery failed: {}".format(compact(exc)))
        log(
            "health snapshot written overall={} healthy={} warning={} critical={}".format(
                snapshot["overall"],
                snapshot["counts"]["healthy"],
                snapshot["counts"]["warning"],
                snapshot["counts"]["critical"],
            )
        )
    finally:
        fcntl.flock(lock_handle.fileno(), fcntl.LOCK_UN)
        lock_handle.close()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        log("fatal: {}".format(compact(exc)))
        sys.exit(1)
