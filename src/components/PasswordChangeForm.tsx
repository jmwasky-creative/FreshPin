"use client";

import { FormEvent, useState } from "react";

export function PasswordChangeForm({ forced }: { forced: boolean }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError("新密码至少需要 8 位。");
    if (password !== confirm) return setError("两次输入的密码不一致。");
    setBusy(true);
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const body: unknown = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      const message = body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "message" in body.error && typeof body.error.message === "string"
        ? body.error.message : "密码修改失败，请稍后重试。";
      setError(message);
      return;
    }
    window.location.assign("/login?passwordChanged=1");
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="new-password">新密码</label>
        <input id="new-password" className="input" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
      </div>
      <div>
        <label className="label" htmlFor="confirm-password">确认新密码</label>
        <input id="confirm-password" className="input" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} minLength={8} required />
      </div>
      {forced && <div className="notice-box text-sm">这是管理员初始密码，请先设置一个仅自己知道的新密码。</div>}
      {error && <div className="error-box text-sm">{error}</div>}
      <button className="button-primary w-full" disabled={busy}>{busy ? "处理中…" : "保存新密码"}</button>
    </form>
  );
}
