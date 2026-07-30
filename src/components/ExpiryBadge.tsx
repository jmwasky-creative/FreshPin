"use client";

import { expiryState, formatDateZh, localDateInTimeZone } from "@/lib/date";

export function ExpiryBadge({ expireDate, remindDaysBefore = 3 }: { expireDate: string | null; remindDaysBefore?: number }) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const state = expiryState(expireDate, remindDaysBefore, localDateInTimeZone(timezone));
  const styles = {
    NORMAL: "bg-emerald-50 text-emerald-800",
    SOON: "bg-amber-50 text-amber-800",
    EXPIRED: "bg-red-50 text-red-800",
    UNKNOWN: "bg-slate-100 text-slate-600",
  }[state];
  const label = state === "EXPIRED" ? "已过期" : state === "SOON" ? "即将过期" : formatDateZh(expireDate);
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles}`}>{label}</span>;
}
