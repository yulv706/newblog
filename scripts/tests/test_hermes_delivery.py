import datetime
import importlib.util
import json
import pathlib
import sys
import tempfile
import unittest
from unittest import mock


SCRIPTS_DIR = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS_DIR))
if sys.platform == "win32":
    sys.modules["fcntl"] = mock.MagicMock()

import hermes_delivery
from hermes_delivery import HermesDeliveryDeferred, send_hermes_message

HEALTH_SPEC = importlib.util.spec_from_file_location(
    "server_health_monitor",
    SCRIPTS_DIR / "server-health-monitor.py",
)
server_health_monitor = importlib.util.module_from_spec(HEALTH_SPEC)
HEALTH_SPEC.loader.exec_module(server_health_monitor)


class HermesDeliveryTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.context_directory = pathlib.Path(self.directory.name, "contexts")
        self.context_directory.mkdir()
        self.context_path = self.context_directory / "account.context-tokens.json"
        self.context_path.write_text('{"token":"one"}', encoding="utf-8")
        self.environment = mock.patch.dict(
            "os.environ",
            {
                "HERMES_DELIVERY_STATE_DIR": self.directory.name,
                "HERMES_MIN_SEND_INTERVAL_SECONDS": "5",
                "HERMES_RATE_LIMIT_BASE_SECONDS": "90",
                "HERMES_RATE_LIMIT_MAX_SECONDS": "900",
                "HERMES_DELIVERY_LOCK_TIMEOUT_SECONDS": "10",
                "HERMES_DEDUPE_SECONDS": "900",
                "HERMES_IDEMPOTENCY_SECONDS": "604800",
                "HERMES_WEBHOOK_SECRET": "a" * 64,
                "HERMES_WEIXIN_CONTEXT_DIR": str(self.context_directory),
            },
        )
        self.environment.start()

    def tearDown(self):
        self.environment.stop()
        self.directory.cleanup()

    @mock.patch.object(hermes_delivery.time, "time", return_value=1000)
    @mock.patch("hermes_delivery.urlopen")
    def test_webhook_uses_replay_protected_hmac_v2(self, urlopen_mock, _time):
        response = mock.Mock()
        response.getcode.return_value = 200
        response.read.return_value = b'{"status":"delivered"}'
        urlopen_mock.return_value = response

        result = hermes_delivery._post_webhook(
            "http://127.0.0.1:8644/webhooks/newblog-notify",
            "a" * 64,
            "hello",
            "request-id",
            10,
        )

        request = urlopen_mock.call_args[0][0]
        self.assertEqual(result["status"], "delivered")
        self.assertEqual(request.get_header("X-webhook-timestamp"), "1000")
        self.assertEqual(len(request.get_header("X-webhook-signature-v2")), 64)
        self.assertIsNone(request.get_header("X-webhook-signature"))

    @mock.patch("hermes_delivery.time.sleep")
    @mock.patch("hermes_delivery._post_webhook")
    def test_rate_limit_stops_retries_and_opens_shared_cooldown(self, post, sleep):
        post.side_effect = RuntimeError(
            "iLink sendmessage rate limited; cooldown active for 30.0s"
        )

        with self.assertRaisesRegex(HermesDeliveryDeferred, "shared cooldown"):
            send_hermes_message(
                "hermes-agent",
                "weixin:test",
                "hello",
                max_attempts=3,
                min_retry_seconds=5,
            )

        self.assertEqual(post.call_count, 1)
        sleep.assert_not_called()
        state = json.loads(
            pathlib.Path(self.directory.name, "state.json").read_text("utf-8")
        )
        self.assertEqual(state["rateLimitStrikes"], 1)
        self.assertGreaterEqual(
            state["nextAllowedEpoch"] - state["lastAttemptEpoch"],
            89,
        )

        post.reset_mock()
        with self.assertRaisesRegex(HermesDeliveryDeferred, "cooldown active"):
            send_hermes_message(
                "hermes-agent",
                "weixin:test",
                "another message",
                max_attempts=3,
            )
        post.assert_not_called()

    @mock.patch("hermes_delivery.time.sleep")
    @mock.patch("hermes_delivery._post_webhook")
    def test_retries_transport_failures_instead_of_hiding_them(self, post, sleep):
        post.side_effect = [
            RuntimeError("Hermes webhook request failed: connection reset"),
            {"status": "delivered"},
        ]

        attempts = send_hermes_message(
            "hermes-agent",
            "weixin:test",
            "hello",
            max_attempts=2,
            min_retry_seconds=7,
        )

        self.assertEqual(attempts, 2)
        self.assertEqual(post.call_count, 2)
        sleep.assert_called_once_with(7)

    @mock.patch("hermes_delivery.time.sleep")
    @mock.patch("hermes_delivery._post_webhook")
    def test_retries_webhook_timeouts(self, post, sleep):
        post.side_effect = [
            RuntimeError("Hermes webhook request failed: timed out"),
            {"status": "delivered"},
        ]

        attempts = send_hermes_message(
            "hermes-agent",
            "weixin:test",
            "hello",
            timeout=10,
            max_attempts=2,
            min_retry_seconds=6,
        )

        self.assertEqual(attempts, 2)
        sleep.assert_called_once_with(6)

    @mock.patch("hermes_delivery.time.sleep")
    @mock.patch("hermes_delivery._post_webhook")
    def test_does_not_retry_permanent_configuration_errors(self, post, sleep):
        post.side_effect = RuntimeError("unknown delivery target")

        with self.assertRaisesRegex(RuntimeError, "unknown delivery target"):
            send_hermes_message(
                "hermes-agent",
                "weixin:test",
                "hello",
                max_attempts=4,
            )

        self.assertEqual(post.call_count, 1)
        sleep.assert_not_called()

    @mock.patch("hermes_delivery.time.sleep")
    @mock.patch("hermes_delivery._post_webhook")
    def test_serial_gate_spaces_successive_messages(self, post, sleep):
        post.return_value = {"status": "delivered"}

        send_hermes_message("hermes-agent", "weixin:test", "first")
        send_hermes_message("hermes-agent", "weixin:test", "second")

        self.assertEqual(post.call_count, 2)
        sleep.assert_called_once_with(5)

    @mock.patch("hermes_delivery.time.sleep")
    @mock.patch("hermes_delivery._post_webhook")
    def test_idempotency_key_prevents_duplicate_delivery(self, post, sleep):
        post.return_value = {"status": "delivered"}

        first = send_hermes_message(
            "hermes-agent",
            "weixin:test",
            "registration",
            idempotency_key="registration:42",
        )
        duplicate = send_hermes_message(
            "hermes-agent",
            "weixin:test",
            "registration",
            idempotency_key="registration:42",
        )

        self.assertEqual(first, 1)
        self.assertEqual(duplicate, 0)
        self.assertEqual(post.call_count, 1)
        sleep.assert_not_called()

    @mock.patch("hermes_delivery.time.sleep")
    @mock.patch("hermes_delivery._post_webhook")
    def test_webhook_rejection_opens_long_shared_cooldown(self, post, sleep):
        post.side_effect = RuntimeError(
            "Hermes webhook returned HTTP 502: Delivery failed"
        )

        with self.assertRaisesRegex(HermesDeliveryDeferred, "shared cooldown"):
            send_hermes_message("hermes-agent", "weixin:test", "hello")

        state = json.loads(
            pathlib.Path(self.directory.name, "state.json").read_text("utf-8")
        )
        self.assertGreaterEqual(
            state["nextAllowedEpoch"] - state["lastAttemptEpoch"],
            21599,
        )
        post.assert_called_once()
        sleep.assert_not_called()

        state["nextAllowedEpoch"] = 0
        pathlib.Path(self.directory.name, "state.json").write_text(
            json.dumps(state), encoding="utf-8"
        )
        with self.assertRaisesRegex(
            HermesDeliveryDeferred, "context has not refreshed"
        ):
            send_hermes_message("hermes-agent", "weixin:test", "still blocked")
        post.assert_called_once()

    @mock.patch("hermes_delivery.time.sleep")
    @mock.patch("hermes_delivery._post_webhook")
    def test_new_inbound_context_releases_shared_cooldown(self, post, sleep):
        post.side_effect = [
            RuntimeError("Hermes webhook returned HTTP 502: Delivery failed"),
            {"status": "delivered"},
        ]

        with self.assertRaises(HermesDeliveryDeferred):
            send_hermes_message("hermes-agent", "weixin:test", "first")

        self.context_path.write_text(
            '{"token":"refreshed-and-longer"}',
            encoding="utf-8",
        )
        attempts = send_hermes_message(
            "hermes-agent",
            "weixin:test",
            "second",
        )

        self.assertEqual(attempts, 1)
        self.assertEqual(post.call_count, 2)
        state = json.loads(
            pathlib.Path(self.directory.name, "state.json").read_text("utf-8")
        )
        self.assertEqual(state["rateLimitStrikes"], 0)
        self.assertEqual(state["blockedContextFingerprint"], "")
        sleep.assert_not_called()


class ProactivePushHealthTests(unittest.TestCase):
    def test_parses_timezone_heartbeat_on_python_36_compatible_path(self):
        heartbeat = datetime.datetime.utcnow().isoformat() + "+00:00"
        age = server_health_monitor.iso_age_seconds(heartbeat)

        self.assertIsNotNone(age)
        self.assertLess(age, 5)

    @mock.patch.object(
        server_health_monitor,
        "local_now",
        return_value=datetime.datetime(2026, 7, 28, 8, 0, 0),
    )
    def test_expects_previous_day_before_delivery_grace_window(self, _now):
        self.assertEqual(
            server_health_monitor.expected_delivery_date(18),
            "2026-07-27",
        )
        self.assertEqual(
            server_health_monitor.expected_delivery_date(23),
            "2026-07-27",
        )

    @mock.patch.object(
        server_health_monitor,
        "local_now",
        return_value=datetime.datetime(2026, 7, 28, 18, 31, 0),
    )
    def test_expects_current_report_after_delivery_grace_window(self, _now):
        self.assertEqual(
            server_health_monitor.expected_delivery_date(18),
            "2026-07-28",
        )
        self.assertTrue(
            server_health_monitor.delivery_is_fresh("2026-07-28", "2026-07-27")
        )

    def test_marks_failed_oneshot_result_unhealthy(self):
        self.assertTrue(
            server_health_monitor.unit_failed(
                {
                    "ActiveState": "failed",
                    "Result": "exit-code",
                    "ExecMainStatus": "1",
                }
            )
        )
        self.assertFalse(
            server_health_monitor.unit_failed(
                {
                    "ActiveState": "inactive",
                    "Result": "success",
                    "ExecMainStatus": "0",
                }
            )
        )
        self.assertFalse(
            server_health_monitor.unit_failed(
                {
                    "ActiveState": "inactive",
                    "Result": "success",
                    "ExecMainStatus": "1",
                }
            )
        )
        self.assertTrue(
            server_health_monitor.unit_deferred(
                {
                    "ActiveState": "failed",
                    "Result": "exit-code",
                    "ExecMainStatus": "75",
                }
            )
        )
        self.assertFalse(
            server_health_monitor.unit_deferred(
                {
                    "ActiveState": "inactive",
                    "Result": "success",
                    "ExecMainStatus": "75",
                }
            )
        )

    @mock.patch.object(server_health_monitor.time, "time", return_value=1000)
    @mock.patch.object(server_health_monitor, "send_alert")
    def test_transport_checks_alert_by_email_even_when_weixin_is_broken(
        self, send_alert, _time
    ):
        check = server_health_monitor.make_check(
            "proactive_push",
            "automation",
            "critical",
            "Hermes 主动推送",
            "delivery failed",
        )

        with tempfile.TemporaryDirectory() as directory:
            config = mock.Mock(
                alert_state_path=str(pathlib.Path(directory) / "state.json"),
                repeat_alert_seconds=21600,
                alert_failure_retry_seconds=1800,
                warning_confirm_seconds=900,
                critical_confirm_seconds=0,
                send_recovery_alerts=False,
            )
            server_health_monitor.process_alerts(config, [check])

            state = json.loads(pathlib.Path(config.alert_state_path).read_text("utf-8"))
            stored = state["checks"]["proactive_push"]
            self.assertEqual(stored["status"], "critical")
            self.assertEqual(stored["lastAttemptEpoch"], 1000)
            self.assertEqual(stored["lastDeliveryError"], "")
            send_alert.assert_called_once()
            self.assertFalse(send_alert.call_args.kwargs["allow_weixin"])

    @mock.patch.object(server_health_monitor.time, "time", return_value=1000)
    @mock.patch.object(server_health_monitor, "send_alert")
    def test_transient_warning_waits_for_confirmation(self, send_alert, _time):
        check = server_health_monitor.make_check(
            "steam_games",
            "automation",
            "warning",
            "Steam 游戏档案",
            "temporary timeout",
        )

        with tempfile.TemporaryDirectory() as directory:
            config = mock.Mock(
                alert_state_path=str(pathlib.Path(directory) / "state.json"),
                repeat_alert_seconds=21600,
                alert_failure_retry_seconds=1800,
                warning_confirm_seconds=900,
                critical_confirm_seconds=300,
                send_recovery_alerts=False,
            )
            server_health_monitor.process_alerts(config, [check])

            stored = json.loads(
                pathlib.Path(config.alert_state_path).read_text("utf-8")
            )["checks"]["steam_games"]
            self.assertEqual(stored["problemSinceEpoch"], 1000)
            self.assertEqual(stored["problemObservations"], 1)
            send_alert.assert_not_called()


if __name__ == "__main__":
    unittest.main()
