import { redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { InviteManager, type InviteView } from "@/components/InviteManager";
import { getCurrentUser } from "@/lib/auth";
import { isAdminUser, mustChangePassword } from "@/lib/authz";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function InviteAdminPage() {
  if (!hasSupabasePublicEnv()) redirect("/login");
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/invites");
  if (mustChangePassword(user)) redirect("/change-password");
  if (!isAdminUser(user)) redirect("/");

  const { data, error } = await createAdminClient()
    .from("invite_codes")
    .select("id,status,created_at,disabled_at,used_at,expires_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    return (
      <main className="page-shell">
        <AppHeader title="邀请码管理" />
        <section className="card p-6 sm:p-8">
          <h1 className="text-2xl font-black">邀请码功能尚未初始化</h1>
          <p className="muted mt-3 leading-7">请在 Supabase SQL Editor 中先执行项目文件：</p>
          <code className="mt-3 block rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold">supabase/migrations/002_invite_auth.sql</code>
          <p className="muted mt-3 text-sm leading-6">执行成功后刷新本页面，即可生成和停用一次性邀请码。</p>
          <Link href="/" className="button-primary mt-5 inline-flex">返回首页</Link>
        </section>
      </main>
    );
  }

  const invites: InviteView[] = data.map((invite) => ({
    id: invite.id,
    status: invite.status,
    createdAt: invite.created_at,
    disabledAt: invite.disabled_at,
    usedAt: invite.used_at,
    expiresAt: invite.expires_at,
  }));

  return (
    <main className="page-shell">
      <AppHeader title="邀请码管理" />
      <InviteManager initialInvites={invites} />
    </main>
  );
}
