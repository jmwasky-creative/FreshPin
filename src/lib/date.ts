import type { ShelfLifeUnit } from "@/types/domain";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string | null | undefined): boolean {
  if (!value || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function addShelfLife(
  produceDate: string,
  value: number,
  unit: ShelfLifeUnit,
): string {
  if (!isIsoDate(produceDate)) throw new Error("Invalid production date");
  if (!Number.isInteger(value) || value <= 0) throw new Error("Invalid shelf life value");

  const source = new Date(`${produceDate}T00:00:00Z`);
  if (unit === "DAY") {
    source.setUTCDate(source.getUTCDate() + value);
    return toIsoDate(source);
  }

  const originalDay = source.getUTCDate();
  const originalMonth = source.getUTCMonth();
  const originalYear = source.getUTCFullYear();

  const targetMonthOffset = unit === "MONTH" ? value : value * 12;
  const monthTotal = originalMonth + targetMonthOffset;
  const targetYear = originalYear + Math.floor(monthTotal / 12);
  const targetMonth = ((monthTotal % 12) + 12) % 12;
  const targetDay = Math.min(originalDay, daysInUtcMonth(targetYear, targetMonth));

  return toIsoDate(new Date(Date.UTC(targetYear, targetMonth, targetDay)));
}

export function calculateExpireDate(input: {
  produceDate: string | null;
  shelfLifeValue: number | null;
  shelfLifeUnit: ShelfLifeUnit | null;
  expireDate: string | null;
}): string | null {
  if (input.expireDate && isIsoDate(input.expireDate)) return input.expireDate;
  if (
    input.produceDate &&
    input.shelfLifeValue &&
    input.shelfLifeUnit &&
    isIsoDate(input.produceDate)
  ) {
    return addShelfLife(input.produceDate, input.shelfLifeValue, input.shelfLifeUnit);
  }
  return null;
}

export function localDateInTimeZone(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const value = `${get("year")}-${get("month")}-${get("day")}`;
  return isIsoDate(value) ? value : toIsoDate(now);
}

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

export function diffCalendarDays(fromDate: string, toDate: string): number {
  if (!isIsoDate(fromDate) || !isIsoDate(toDate)) throw new Error("Invalid ISO date");
  const from = Date.parse(`${fromDate}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

export type ExpiryState = "NORMAL" | "SOON" | "EXPIRED" | "UNKNOWN";

export function expiryState(
  expireDate: string | null,
  remindDaysBefore: number,
  today: string,
): ExpiryState {
  if (!expireDate || !isIsoDate(expireDate)) return "UNKNOWN";
  const days = diffCalendarDays(today, expireDate);
  if (days < 0) return "EXPIRED";
  if (days <= remindDaysBefore) return "SOON";
  return "NORMAL";
}

export function formatDateZh(value: string | null): string {
  if (!value || !isIsoDate(value)) return "日期未知";
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}
