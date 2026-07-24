import nodemailer from "nodemailer";
import type { AppLocale } from "@/lib/i18n/config";

type SmtpConfiguration = {
  host: string;
  port: number;
  secure: boolean;
  requireTls: boolean;
  user?: string;
  password?: string;
  from: string;
  replyTo?: string;
};

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null =
  null;
let cachedConfigurationKey = "";

function parseBoolean(value: string | undefined, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function getSmtpConfiguration(): SmtpConfiguration | null {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const password = process.env.SMTP_PASSWORD?.trim() ?? "";
  const from = process.env.SMTP_FROM?.trim() ?? "";
  const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10);
  const secure = parseBoolean(process.env.SMTP_SECURE, port === 465);

  if (
    !host ||
    !from ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535 ||
    Boolean(user) !== Boolean(password)
  ) {
    return null;
  }

  return {
    host,
    port,
    secure,
    requireTls: parseBoolean(process.env.SMTP_REQUIRE_TLS, !secure),
    user: user || undefined,
    password: password || undefined,
    from,
    replyTo: process.env.SMTP_REPLY_TO?.trim() || undefined,
  };
}

function getTransporter(configuration: SmtpConfiguration) {
  const configurationKey = JSON.stringify({
    host: configuration.host,
    port: configuration.port,
    secure: configuration.secure,
    requireTls: configuration.requireTls,
    user: configuration.user,
  });

  if (cachedTransporter && cachedConfigurationKey === configurationKey) {
    return cachedTransporter;
  }

  cachedConfigurationKey = configurationKey;
  cachedTransporter = nodemailer.createTransport({
    host: configuration.host,
    port: configuration.port,
    secure: configuration.secure,
    requireTLS: configuration.requireTls,
    auth:
      configuration.user && configuration.password
        ? {
            user: configuration.user,
            pass: configuration.password,
          }
        : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  return cachedTransporter;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function isEmailDeliveryConfigured() {
  return getSmtpConfiguration() !== null;
}

export async function verifyEmailDeliveryConfiguration() {
  const configuration = getSmtpConfiguration();
  if (!configuration) {
    return {
      ok: false as const,
      error: "SMTP is not configured.",
    };
  }

  try {
    await getTransporter(configuration).verify();
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "SMTP connection or authentication failed.",
    };
  }
}

export async function sendAuthenticationCodeEmail({
  to,
  code,
  locale,
}: {
  to: string;
  code: string;
  locale: AppLocale;
}) {
  const configuration = getSmtpConfiguration();
  if (!configuration) {
    throw new Error("EMAIL_DELIVERY_NOT_CONFIGURED");
  }

  const isChinese = locale === "zh-CN";
  const subject = isChinese
    ? `${code} 是你的读写札记验证码`
    : `${code} is your Read & Write verification code`;
  const intro = isChinese
    ? "你正在登录读写札记。"
    : "You are signing in to Read & Write.";
  const expiry = isChinese
    ? "验证码将在 10 分钟后失效，请勿转发给任何人。"
    : "This code expires in 10 minutes. Do not share it with anyone.";
  const ignore = isChinese
    ? "如果不是你本人操作，可以忽略这封邮件。"
    : "If you did not request this code, you can ignore this email.";

  await getTransporter(configuration).sendMail({
    from: configuration.from,
    to,
    replyTo: configuration.replyTo,
    subject,
    text: `${intro}\n\n${code}\n\n${expiry}\n${ignore}`,
    html: `
      <div style="margin:0 auto;max-width:520px;padding:32px 20px;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#171717">
        <p style="margin:0 0 24px;font-size:13px;letter-spacing:.12em;color:#6b7280">READ · WRITE</p>
        <p style="margin:0 0 18px;font-size:16px;line-height:1.7">${escapeHtml(intro)}</p>
        <div style="margin:0 0 22px;padding:20px 24px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:600;letter-spacing:.2em;text-align:center">${escapeHtml(code)}</div>
        <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#4b5563">${escapeHtml(expiry)}</p>
        <p style="margin:0;font-size:13px;line-height:1.7;color:#9ca3af">${escapeHtml(ignore)}</p>
      </div>
    `,
  });
}
