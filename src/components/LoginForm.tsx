"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isValidInviteCode, normalizeInviteCode } from "@/lib/invite-code";
import { safeRedirectPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "register" | "forgot";

export function LoginForm() {
  const params = useSearchParams();
  const next = safeRedirectPath(params.get("next"));
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function switchMode(nextMode: Mode) {
    setMode(nextMode); setMessage(null); setError(null); setPassword(""); setPasswordConfirm("");
  }

  async function syncTimezone() {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await fetch("/api/settings/timezone", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ timezone }),
    }).catch(() => undefined);
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null); setMessage(null);
    const { error: authError } = await createClient().auth.signInWithPassword({
      email: email.trim(), password,
    });
    setBusy(false);
    if (authError) return setError("邮箱或密码不正确，或邮箱尚未完成验证。");
    await syncTimezone();
    window.location.assign(next);
  }

  async function register(event: FormEvent) {
    event.preventDefault();
    setError(null); setMessage(null);
    const normalizedInvite = normalizeInviteCode(inviteCode);
    if (!isValidInviteCode(normalizedInvite)) {
      setError("请输入有效的邀请码。");
      return;
    }
    if (password.length < 8) {
      setError("密码至少需要 8 位。");
      return;
    }
    if (password !== passwordConfirm) {
      setError("两次输入的密码不一致。");
      return;
    }

    setBusy(true);
    const { error: authError } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { invite_code: normalizedInvite },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    setBusy(false);
    if (authError) {
      setError("注册未完成。邀请码可能无效、已使用、已停用，或邮箱不可用。");
      return;
    }
    setMessage("注册请求已提交，请查收验证邮件。完成验证后即可用邮箱和密码登录。");
    setPassword(""); setPasswordConfirm(""); setInviteCode("");
  }

  async function requestReset(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null); setMessage(null);
    const { error: authError } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm`,
    });
    setBusy(false);
    if (authError) return setError("请求未能发送，请稍后重试。");
    setMessage("如果该邮箱已注册，重置密码邮件将很快发送到你的邮箱。");
  }

  const submit = mode === "login" ? login : mode === "register" ? register : requestReset;
  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="email">邮箱</label>
        <input id="email" type="email" autoComplete="email" className="input" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" />
      </div>
      {mode !== "forgot" && (
        <div>
          <label className="label" htmlFor="password">密码</label>
          <input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} className="input" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode === "login" ? 1 : 8} />
        </div>
      )}
      {mode === "register" && (
        <>
          <div>
            <label className="label" htmlFor="password-confirm">确认密码</label>
            <input id="password-confirm" type="password" autoComplete="new-password" className="input" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} required minLength={8} />
          </div>
          <div>
            <label className="label" htmlFor="invite-code">邀请码</label>
            <input id="invite-code" className="input font-mono" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} required placeholder="FP-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" />
            <p className="muted mt-1 text-xs">邀请码提交注册后即被占用。</p>
          </div>
        </>
      )}
      {message && <div className="notice-box text-sm">{message}</div>}
      {error && <div className="error-box text-sm">{error}</div>}
      {params.get("authError") === "1" && !error && <div className="error-box text-sm">验证链接无效、已过期或已被使用，请重新操作。</div>}
      <button className="button-primary w-full" disabled={busy}>
        {busy ? "处理中…" : mode === "login" ? "登录" : mode === "register" ? "注册并验证邮箱" : "发送重置邮件"}
      </button>
      <div className="flex flex-col gap-2 text-center text-sm font-semibold text-emerald-800">
        {mode !== "login" && <button type="button" onClick={() => switchMode("login")}>返回登录</button>}
        {mode === "login" && <button type="button" onClick={() => switchMode("forgot")}>忘记密码</button>}
        {mode !== "register" && <button type="button" onClick={() => switchMode("register")}>使用邀请码注册</button>}
      </div>
    </form>
  );
}
