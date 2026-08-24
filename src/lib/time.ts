import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { formatDistanceToNowStrict } from "date-fns";
import { ar, enUS } from "date-fns/locale";

export const DEFAULT_TIMEZONE = "Asia/Riyadh";

export function formatDateTime(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE,
  locale: "ar" | "en" = "ar",
  pattern = "d MMMM yyyy, h:mm a",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, timezone, pattern, { locale: locale === "ar" ? ar : enUS });
}

export function formatDate(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE,
  locale: "ar" | "en" = "ar",
): string {
  return formatDateTime(date, timezone, locale, "d MMMM yyyy");
}

export function formatRelative(date: Date | string, locale: "ar" | "en" = "ar"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNowStrict(d, { addSuffix: true, locale: locale === "ar" ? ar : enUS });
}

export function nowInTimezone(timezone: string = DEFAULT_TIMEZONE): Date {
  return toZonedTime(new Date(), timezone);
}

export interface Countdown {
  totalMs: number;
  expired: boolean;
  days: number;
  hours: number;
  minutes: number;
}

export function getCountdown(deadline: Date | string): Countdown {
  const d = typeof deadline === "string" ? new Date(deadline) : deadline;
  const totalMs = d.getTime() - Date.now();
  if (totalMs <= 0) {
    return { totalMs: 0, expired: true, days: 0, hours: 0, minutes: 0 };
  }
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((totalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  return { totalMs, expired: false, days, hours, minutes };
}

export function formatCountdownAr(countdown: Countdown): string {
  if (countdown.expired) return "انتهت المهلة";
  const parts: string[] = [];
  if (countdown.days > 0) parts.push(`${countdown.days} يوم`);
  if (countdown.hours > 0) parts.push(`${countdown.hours} ساعة`);
  if (countdown.days === 0 && countdown.minutes > 0) parts.push(`${countdown.minutes} دقيقة`);
  return parts.length > 0 ? parts.join(" و") : "أقل من دقيقة";
}
