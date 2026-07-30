import type { NextRequest } from "next/server";
import { fail, ok, ApiError } from "@/lib/api";
import { addShelfLife, diffCalendarDays, localDateInTimeZone, toIsoDate } from "@/lib/date";
import { sendReminderEmail, type ReminderEmailItem } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Candidate = {
  id: string;
  user_id: string;
  name: string;
  expire_date: string;
  remind_days_before: number;
  location: unknown;
};

type Settings = {
  user_id: string;
  email: string;
  timezone: string;
  reminder_enabled: boolean;
};

function relationObject(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return relationObject(value[0]);
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function relationName(value: unknown): string {
  return String(relationObject(value)?.name ?? "未知位置");
}

export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
      throw new ApiError("Unauthorized", 401, "UNAUTHORIZED_CRON");
    }

    const admin = createAdminClient();
    const utcToday = toIsoDate(new Date());
    const lowerDate = toIsoDate(new Date(Date.now() - 2 * 86_400_000));
    const upperDate = addShelfLife(utcToday, 365, "DAY");
    const { data: candidateRows, error: candidatesError } = await admin
      .from("items")
      .select("id,user_id,name,expire_date,remind_days_before,location:locations(name,space:spaces(name))")
      .eq("status", "ACTIVE")
      .not("expire_date", "is", null)
      .gte("expire_date", lowerDate)
      .lte("expire_date", upperDate)
      .limit(2000);
    if (candidatesError) throw candidatesError;

    const candidates = (candidateRows ?? []) as unknown as Candidate[];
    const userIds = [...new Set(candidates.map((item) => item.user_id))];
    if (!userIds.length) return ok({ candidates: 0, sent: 0, skipped: 0 });

    const { data: settingsRows, error: settingsError } = await admin
      .from("user_settings")
      .select("user_id,email,timezone,reminder_enabled")
      .in("user_id", userIds);
    if (settingsError) throw settingsError;
    const settings = new Map(((settingsRows ?? []) as Settings[]).map((row) => [row.user_id, row]));

    const groups = new Map<string, { email: string; entries: Array<{ logId: string; item: ReminderEmailItem }> }>();
    let skipped = 0;

    for (const candidate of candidates) {
      const userSettings = settings.get(candidate.user_id);
      if (!userSettings?.reminder_enabled || !userSettings.email) { skipped += 1; continue; }
      const localDate = localDateInTimeZone(userSettings.timezone || "UTC");
      const daysRemaining = diffCalendarDays(localDate, candidate.expire_date);
      const kind = daysRemaining <= 0
        ? "EXPIRE_TODAY"
        : daysRemaining <= candidate.remind_days_before
          ? "BEFORE_EXPIRE"
          : null;
      if (!kind) continue;

      const { data: previousLogs, error: previousError } = await admin
        .from("reminder_logs")
        .select("id,send_status,local_date")
        .eq("item_id", candidate.id)
        .eq("reminder_kind", kind)
        .order("created_at", { ascending: false })
        .limit(1);
      if (previousError) throw previousError;
      const previous = previousLogs?.[0];
      if (previous?.send_status === "SENT" || previous?.send_status === "PENDING") {
        skipped += 1;
        continue;
      }

      let log: { id: string } | null = null;
      if (previous?.send_status === "FAILED") {
        const { data: retried, error: retryError } = await admin
          .from("reminder_logs")
          .update({ send_status: "PENDING", error_message: null, local_date: localDate })
          .eq("id", previous.id)
          .select("id")
          .single();
        if (retryError) throw retryError;
        log = retried;
      } else {
        const { data: inserted, error: logError } = await admin
          .from("reminder_logs")
          .insert({
            user_id: candidate.user_id,
            item_id: candidate.id,
            reminder_kind: kind,
            local_date: localDate,
            send_status: "PENDING",
          })
          .select("id")
          .maybeSingle();
        if (logError) {
          if (logError.code === "23505") { skipped += 1; continue; }
          throw logError;
        }
        log = inserted;
      }
      if (!log) { skipped += 1; continue; }

      const location = relationObject(candidate.location);
      const space = relationObject(location?.space);
      const group = groups.get(candidate.user_id) ?? { email: userSettings.email, entries: [] };
      group.entries.push({
        logId: log.id,
        item: {
          name: candidate.name,
          locationName: relationName(candidate.location),
          spaceName: relationName(space),
          expireDate: candidate.expire_date,
          daysRemaining,
        },
      });
      groups.set(candidate.user_id, group);
    }

    let sent = 0;
    let failed = 0;
    for (const group of groups.values()) {
      const logIds = group.entries.map((entry) => entry.logId);
      try {
        await sendReminderEmail({ to: group.email, items: group.entries.map((entry) => entry.item) });
        await admin.from("reminder_logs").update({ send_status: "SENT", error_message: null }).in("id", logIds);
        sent += group.entries.length;
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown email error";
        await admin.from("reminder_logs").update({ send_status: "FAILED", error_message: message }).in("id", logIds);
        failed += group.entries.length;
      }
    }

    return ok({ candidates: candidates.length, sent, failed, skipped });
  } catch (error) {
    return fail(error);
  }
}
