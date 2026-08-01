"use client";

import { useState } from "react";

export type InviteView = {
  id: string;
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  disabledAt: string | null;
  usedAt: string | null;
  expiresAt: string | null;
};

function messageFromResponse(body: unknown): string {
  if (
    body && typeof body === "object" && "error" in body &&
    body.error && typeof body.error === "object" && "message" in body.error &&
    typeof body.error.message === "string"
  ) return body.error.message;
  return "操作失败，请稍后重试。";
}

function inviteState(invite: InviteView): string {
  if (invite.usedAt) return "已使用";
  if (invite.status === "DISABLED") return "已停用";
  if (invite.expiresAt && new Date(invite.expiresAt) <= new Date()) return "已过期";
  return "可使用";
}

function formatDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}

export function InviteManager({ initialInvites }: { initialInvites: InviteView[] }) {
  const [invites, setInvites] = useState(initialInvites);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createInvite() {
    setBusy(true); setError(null); setNewCode(null);
    const response = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const body: unknown = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok || !body || typeof body !== "object" || !("data" in body)) {
      setError(messageFromResponse(body));
      return;
    }
    const data = body.data as { code: string; invite: InviteView };
    setNewCode(data.code);
    setInvites((current) => [data.invite, ...current]);
  }

  async function disableInvite(inviteId: string) {
    setBusy(true); setError(null);
    const response = await fetch(`/api/admin/invites/${inviteId}`, { method: "PATCH" });
    const body: unknown = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok || !body || typeof body !== "object" || !("data" in body)) {
      setError(messageFromResponse(body));
      return;
    }
    const updated = body.data as InviteView;
    setInvites((current) => current.map((invite) => invite.id === updated.id ? updated : invite));
  }

  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">创建一次性邀请码</h2>
            <p className="muted mt-1 text-sm">邀请码只显示这一次；注册提交后即占用。</p>
          </div>
          <button className="button-primary" onClick={createInvite} disabled={busy}>
            {busy ? "处理中…" : "生成邀请码"}
          </button>
        </div>
        {newCode && (
          <div className="notice-box mt-5">
            <p className="text-sm font-semibold">请立即复制并安全发送给受邀者：</p>
            <code className="mt-2 block break-all rounded-xl bg-white/70 px-3 py-2 text-base font-black tracking-wide text-emerald-950">{newCode}</code>
          </div>
        )}
        {error && <div className="error-box mt-4 text-sm">{error}</div>}
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6"><h2 className="text-xl font-black">邀请码记录</h2></div>
        {invites.length === 0 ? (
          <p className="muted p-6">尚未创建邀请码。</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {invites.map((invite) => {
              const state = inviteState(invite);
              const canDisable = invite.status === "ACTIVE" && !invite.usedAt;
              return (
                <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 p-5 sm:px-6">
                  <div className="text-sm">
                    <p className="font-bold">{state}</p>
                    <p className="muted mt-1">创建于 {formatDate(invite.createdAt)} · 使用于 {formatDate(invite.usedAt)}</p>
                  </div>
                  {canDisable && <button className="button-secondary text-sm" onClick={() => disableInvite(invite.id)} disabled={busy}>停用</button>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
