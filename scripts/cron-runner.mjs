const internalUrl = (process.env.APP_INTERNAL_URL || "http://app:3000").replace(/\/$/, "");
const secret = process.env.CRON_SECRET;
const intervalMinutes = Math.max(1, Number(process.env.CRON_INTERVAL_MINUTES || 60));
const runOnStart = String(process.env.RUN_CRON_ON_START || "true").toLowerCase() === "true";

if (!secret) {
  console.error("[scheduler] CRON_SECRET is required.");
  process.exit(1);
}

async function triggerReminderCron() {
  const startedAt = new Date().toISOString();
  try {
    const response = await fetch(`${internalUrl}/api/cron/reminders`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${secret}`,
        "user-agent": "keepspot-docker-scheduler/1.0",
      },
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${body.slice(0, 1000)}`);
    }
    console.log(`[scheduler] ${startedAt} reminder run succeeded: ${body}`);
  } catch (error) {
    console.error(`[scheduler] ${startedAt} reminder run failed:`, error);
  }
}

console.log(
  `[scheduler] started; interval=${intervalMinutes} minute(s); target=${internalUrl}/api/cron/reminders`,
);

if (runOnStart) {
  await triggerReminderCron();
}

setInterval(triggerReminderCron, intervalMinutes * 60_000);
