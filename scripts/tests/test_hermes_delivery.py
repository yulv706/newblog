import datetime
import importlib.util
import pathlib
import subprocess
import sys
import unittest
from unittest import mock


SCRIPTS_DIR = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS_DIR))
if sys.platform == "win32":
    sys.modules["fcntl"] = mock.MagicMock()

from hermes_delivery import send_hermes_message

HEALTH_SPEC = importlib.util.spec_from_file_location(
    "server_health_monitor",
    SCRIPTS_DIR / "server-health-monitor.py",
)
server_health_monitor = importlib.util.module_from_spec(HEALTH_SPEC)
HEALTH_SPEC.loader.exec_module(server_health_monitor)


def completed(returncode, stderr=b"", stdout=b""):
    return subprocess.CompletedProcess([], returncode, stdout=stdout, stderr=stderr)


class HermesDeliveryTests(unittest.TestCase):
    @mock.patch("hermes_delivery.time.sleep")
    @mock.patch("hermes_delivery.subprocess.run")
    def test_retries_rate_limit_after_reported_cooldown(self, run, sleep):
        run.side_effect = [
            completed(
                1,
                stderr=b"iLink sendmessage rate limited; cooldown active for 30.0s",
            ),
            completed(0),
        ]

        attempts = send_hermes_message(
            "hermes-agent",
            "weixin:test",
            "hello",
            max_attempts=3,
            min_retry_seconds=5,
        )

        self.assertEqual(attempts, 2)
        self.assertEqual(run.call_count, 2)
        sleep.assert_called_once_with(32)

    @mock.patch("hermes_delivery.time.sleep")
    @mock.patch("hermes_delivery.subprocess.run")
    def test_does_not_retry_permanent_configuration_errors(self, run, sleep):
        run.return_value = completed(1, stderr=b"unknown delivery target")

        with self.assertRaisesRegex(RuntimeError, "unknown delivery target"):
            send_hermes_message(
                "hermes-agent",
                "weixin:test",
                "hello",
                max_attempts=4,
            )

        self.assertEqual(run.call_count, 1)
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


if __name__ == "__main__":
    unittest.main()
