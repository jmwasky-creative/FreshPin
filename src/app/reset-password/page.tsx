import { redirect } from "next/navigation";
import { PasswordChangeForm } from "@/components/PasswordChangeForm";
import { getCurrentUser } from "@/lib/auth";
import { hasSupabasePublicEnv } from "@/lib/env";

export default async function ResetPasswordPage() {
  if (!hasSupabasePublicEnv()) redirect("/login");
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="page-shell flex min-h-screen items-center">
      <section className="card w-full p-6 sm:p-9">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-900 text-2xl text-white">⌖</div>
        <h1 className="mt-5 text-3xl font-black">重置密码</h1>
        <p className="muted mt-2 leading-7">请设置一个新的登录密码。</p>
        <PasswordChangeForm forced={false} />
      </section>
    </main>
  );
}
