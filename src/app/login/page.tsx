import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { SetupRequired } from "@/components/SetupRequired";
import { appName, hasSupabasePublicEnv } from "@/lib/env";

export default function LoginPage() {
  if (!hasSupabasePublicEnv()) return <SetupRequired />;
  return (
    <main className="page-shell flex min-h-screen items-center">
      <section className="card w-full p-6 sm:p-9">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-900 text-2xl text-white">⌖</div>
        <h1 className="mt-5 text-3xl font-black">登录 {appName()}</h1>
        <p className="muted mt-2 leading-7">记录物品放在哪里、什么时候过期，并在需要时提醒你。</p>
        <Suspense fallback={<p className="mt-6 muted">加载登录表单…</p>}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
