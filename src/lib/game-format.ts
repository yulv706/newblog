import type { AppLocale } from "@/lib/i18n/config";
import type { GamesCopy } from "@/lib/games-copy";

type UnitCopy = GamesCopy["public"]["units"];

export function interpolateGameCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function formatPlaytime(
  minutes: number,
  locale: AppLocale,
  units: UnitCopy,
  options?: { compact?: boolean }
) {
  const safeMinutes = Math.max(0, Math.round(minutes));
  if (safeMinutes < 60) {
    if (safeMinutes === 1) {
      return units.minute;
    }
    return interpolateGameCopy(units.minutes, { value: safeMinutes });
  }

  const hours = safeMinutes / 60;
  const digits = hours >= 100 || Number.isInteger(hours) ? 0 : 1;
  const value = new Intl.NumberFormat(locale, {
    maximumFractionDigits: options?.compact ? 0 : digits,
  }).format(hours);

  if (hours === 1) {
    return units.hour;
  }
  return interpolateGameCopy(units.hours, { value });
}

export function formatRelativeGameDate(value: string | null, locale: AppLocale, units: UnitCopy) {
  if (!value) {
    return units.never;
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return units.never;
  }

  const today = new Date();
  const date = new Date(timestamp);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDelta = Math.round((todayStart - dateStart) / 86_400_000);

  if (dayDelta <= 0) {
    return units.today;
  }
  if (dayDelta === 1) {
    return units.yesterday;
  }
  if (dayDelta < 30) {
    return interpolateGameCopy(units.daysAgoTemplate, { value: dayDelta });
  }

  return date.toLocaleDateString(locale, {
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
    month: "short",
    day: "numeric",
  });
}
