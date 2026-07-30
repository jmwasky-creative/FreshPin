"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { safeRedirectPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const params = useSearchParams();
  const next = safeRedirectPath(params.get("next"));
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null); setMessage(null);
    const { error: authError } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (authError) return setError(authError.message);
    setStage("code");
    setMessage("验证码已经发送，请查看邮箱。");
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null);
    const { error: authError } = await createClient().auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    if (authError) {
      setBusy(false);
      return setError(authError.message);
    }
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await fetch("/api/settings/timezone", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ timezone }),
    }).catch(() => undefined);
    window.location.href = next;
  }

  return (
    <form onSubmit={stage === "email" ? sendCode : verifyCode} className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="email">邮箱</label>
        <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={stage === "code"} placeholder="you@example.com" />
      </div>
      {stage === "code" && (
        <div>
          <label className="label" htmlFor="code">邮箱验证码</label>
          <input id="code" inputMode="numeric" autoComplete="one-time-code" className="input" value={code} onChange={(e) => setCode(e.target.value)} required placeholder="输入验证码" />
        </div>
      )}
      {message && <div className="notice-box text-sm">{message}</div>}
      {error && <div className="error-box text-sm">{error}</div>}
      <button className="button-primary w-full" disabled={busy}>
        {busy ? "处理中…" : stage === "email" ? "发送验证码" : "登录"}
      </button>
      {stage === "code" && (
        <button type="button" className="w-full text-sm font-semibold text-emerald-800" onClick={() => { setStage("email"); setCode(""); setMessage(null); }}>
          更换邮箱
        </button>
      )}
    </form>
  );
}
