import type { AppLocale } from "@/lib/i18n/config";
import type {
  SystemHealthGroup,
  SystemHealthOverall,
  SystemHealthStatus,
} from "@/lib/admin/system-health";

const copy = {
  "zh-CN": {
    title: "系统状态",
    description: "服务端关键链路与自动任务",
    refreshLabel: "刷新状态",
    autoRefreshLabel: "自动刷新",
    lastCheckedLabel: "监测时间",
    versionLabel: "版本",
    refreshError: "暂时无法刷新状态",
    groups: {
      application: "应用服务",
      automation: "自动化与通知",
      infrastructure: "服务器资源",
      system: "监测系统",
    } satisfies Record<SystemHealthGroup, string>,
    statuses: {
      healthy: "正常",
      warning: "需关注",
      critical: "异常",
      unknown: "等待数据",
    } satisfies Record<SystemHealthStatus, string>,
    overall: {
      healthy: "运行正常",
      degraded: "部分需关注",
      critical: "存在异常",
    } satisfies Record<SystemHealthOverall, string>,
    summary: {
      healthy: "正常",
      warning: "需关注",
      critical: "异常",
      unknown: "待确认",
    } satisfies Record<SystemHealthStatus, string>,
    checkTitles: {
      app_runtime: "应用运行时",
      monitor_freshness: "服务器监测器",
      app_container: "博客应用",
      nginx_container: "Web 入口",
      site_https: "公网访问",
      rss_feed: "RSS",
      database: "数据库",
      smtp_delivery: "邮箱注册",
      registration_notifications: "注册主动通知",
      weread_sync: "微信读书同步",
      hermes_gateway: "Hermes 与微信",
      proactive_push: "Hermes 主动推送",
      tls_certificate: "HTTPS 证书",
      disk_space: "磁盘空间",
      memory: "内存",
      backups: "数据备份",
    } as Record<string, string>,
  },
  en: {
    title: "System Status",
    description: "Critical server paths and scheduled automation",
    refreshLabel: "Refresh status",
    autoRefreshLabel: "Auto refresh",
    lastCheckedLabel: "Monitored",
    versionLabel: "Version",
    refreshError: "Status refresh is temporarily unavailable",
    groups: {
      application: "Application Services",
      automation: "Automation & Notifications",
      infrastructure: "Server Resources",
      system: "Monitoring",
    } satisfies Record<SystemHealthGroup, string>,
    statuses: {
      healthy: "Healthy",
      warning: "Attention",
      critical: "Incident",
      unknown: "Awaiting data",
    } satisfies Record<SystemHealthStatus, string>,
    overall: {
      healthy: "All systems operational",
      degraded: "Some checks need attention",
      critical: "Active incident",
    } satisfies Record<SystemHealthOverall, string>,
    summary: {
      healthy: "Healthy",
      warning: "Attention",
      critical: "Incident",
      unknown: "Unknown",
    } satisfies Record<SystemHealthStatus, string>,
    checkTitles: {
      app_runtime: "Application runtime",
      monitor_freshness: "Server monitor",
      app_container: "Blog application",
      nginx_container: "Web gateway",
      site_https: "Public HTTPS",
      rss_feed: "RSS",
      database: "Database",
      smtp_delivery: "Email registration",
      registration_notifications: "Registration alerts",
      weread_sync: "WeRead sync",
      hermes_gateway: "Hermes & Weixin",
      proactive_push: "Hermes proactive messages",
      tls_certificate: "TLS certificate",
      disk_space: "Disk space",
      memory: "Memory",
      backups: "Backups",
    } as Record<string, string>,
  },
} as const;

export function getSystemHealthCopy(locale: AppLocale) {
  return copy[locale];
}

export type SystemHealthCopy = ReturnType<typeof getSystemHealthCopy>;
