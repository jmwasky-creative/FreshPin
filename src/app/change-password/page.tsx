import { redirect } from "next/navigation";
import { PasswordChangeForm } from "@/components/PasswordChangeForm";
import { getCurrentUser } from "@/lib/auth";
import { mustChangePassword } from "@/lib/authz";
import { hasSupabasePublicEnv } from "@/lib/env";

export default async function ChangePasswordPage() {
  if (!hasSupabasePublicEnv()) redirect("/login");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!mustChangePassword(user)) redirect("/");

  return (
    <main className="page-shell flex min-h-screen items-center">
      <section className="card w-full p-6 sm:p-9">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-900 text-2xl text-white">⌖</div>
        <h1 className="mt-5 text-3xl font-black">修改初始密码</h1>
        <p className="muted mt-2 leading-7">为保护管理员账号，请先修改默认密码再继续使用。</p>
        <PasswordChangeForm forced />
      </section>
    </main>
  );
}
