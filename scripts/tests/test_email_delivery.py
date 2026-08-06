import base64
import pathlib
import sys
import tempfile
import unittest
from unittest import mock


SCRIPTS_DIR = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS_DIR))

import email_delivery


class EmailDeliveryTests(unittest.TestCase):
    def test_sends_utf8_message_with_stable_idempotency_headers(self):
        with tempfile.TemporaryDirectory() as directory:
            env_file = pathlib.Path(directory, ".env")
            env_file.write_text(
                "\n".join(
                    [
                        "SMTP_HOST=smtp.example.test",
                        "SMTP_PORT=465",
                        "SMTP_SECURE=true",
                        "SMTP_USER=sender@example.test",
                        "SMTP_PASSWORD=secret-value",
                        'SMTP_FROM="读写札记 <sender@example.test>"',
                        "SMTP_REPLY_TO=sender@example.test",
                        "PROACTIVE_EMAIL_TO=2949593180@qq.com",
                    ]
                ),
                encoding="utf-8",
            )
            with mock.patch(
                "email_delivery.smtplib.SMTP_SSL"
            ) as smtp_class:
                smtp = smtp_class.return_value
                attempts = email_delivery.send_email(
                    "读写札记 · 测试",
                    "这是一封 UTF-8 测试邮件。",
                    idempotency_key="test:1",
                    env_file=str(env_file),
                )

            self.assertEqual(attempts, 1)
            smtp_class.assert_called_once()
            smtp.login.assert_called_once_with("sender@example.test", "secret-value")
            smtp.sendmail.assert_called_once()
            message = smtp.sendmail.call_args.args[2]
            encoded_body = base64.b64encode(
                "这是一封 UTF-8 测试邮件。".encode("utf-8")
            ).decode("ascii")
            self.assertIn(encoded_body, message)
            self.assertIn("X-NewBlog-Idempotency-Key: test:1", message)
            self.assertNotIn("secret-value", message)

    @mock.patch("email_delivery.time.sleep")
    @mock.patch("email_delivery._send_once")
    def test_retries_bounded_smtp_failures(self, send_once, sleep):
        send_once.side_effect = [
            email_delivery.smtplib.SMTPException("temporary outage"),
            None,
        ]
        with tempfile.TemporaryDirectory() as directory:
            env_file = pathlib.Path(directory, ".env")
            env_file.write_text(
                "SMTP_HOST=smtp.example.test\n"
                "SMTP_PORT=465\n"
                "SMTP_SECURE=true\n"
                "SMTP_FROM=sender@example.test\n"
                "PROACTIVE_EMAIL_TO=2949593180@qq.com\n",
                encoding="utf-8",
            )
            attempts = email_delivery.send_email(
                "retry",
                "body",
                env_file=str(env_file),
                max_attempts=2,
                retry_seconds=4,
            )

        self.assertEqual(attempts, 2)
        self.assertEqual(send_once.call_count, 2)
        sleep.assert_called_once_with(4)


if __name__ == "__main__":
    unittest.main()
