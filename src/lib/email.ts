import { Resend } from "resend";
import { requireEnv } from "@/lib/env";

export interface ReminderEmailItem {
  name: string;
  locationName: string;
  spaceName: string;
  expireDate: string;
  daysRemaining: number;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char] ?? char);
}

export async function sendReminderEmail(input: {
  to: string;
  items: ReminderEmailItem[];
}) {
  if (process.env.REMINDER_DRY_RUN === "true") {
    console.info("Reminder dry-run", input);
    return { id: `dry-run-${Date.now()}` };
  }

  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const from = requireEnv("REMINDER_FROM_EMAIL");
  const count = input.items.length;
  const rows = input.items
    .map((item) => {
      const when = item.daysRemaining === 0 ? "今天到期" : `还有 ${item.daysRemaining} 天到期`;
      return `<li style="margin:0 0 14px"><strong>${escapeHtml(item.name)}</strong> ${when}<br/><span style="color:#64748b">位置：${escapeHtml(item.spaceName)} &gt; ${escapeHtml(item.locationName)} · 到期日：${escapeHtml(item.expireDate)}</span></li>`;
    })
    .join("");

  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `${count} 件物品需要关注`,
    html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#0f172a"><h2>KeepSpot 到期提醒</h2><p>以下物品即将到期：</p><ul style="padding-left:20px">${rows}</ul><p style="color:#64748b;font-size:13px">请登录 KeepSpot 查看或将物品标记为已使用/已丢弃。</p></div>`,
  });
  if (error) throw new Error(error.message);
  return data;
}
