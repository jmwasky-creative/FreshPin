import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ExpiryBadge } from "@/components/ExpiryBadge";
import { SetupRequired } from "@/components/SetupRequired";
import { TimezoneSync } from "@/components/TimezoneSync";
import { getCurrentUser } from "@/lib/auth";
import { isAdminUser, mustChangePassword } from "@/lib/authz";
import { getDashboardStats, getRecentItems, listSpaces } from "@/lib/data";
import { hasSupabasePublicEnv } from "@/lib/env";
import type { RecentItemView, SpaceView } from "@/types/domain";

function relationName(value: unknown): string {
  if (!value) return "未知位置";
  if (Array.isArray(value)) return relationName(value[0]);
  if (typeof value === "object" && "name" in value) return String((value as { name?: unknown }).name ?? "未知位置");
  return "未知位置";
}

export default async function HomePage() {
  if (!hasSupabasePublicEnv()) return <SetupRequired />;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (mustChangePassword(user)) redirect("/change-password");

  const [spaces, recentItems, stats] = await Promise.all([
    listSpaces(),
    getRecentItems(),
    getDashboardStats(),
  ]);

  return (
    <main className="page-shell">
      <TimezoneSync />
      <AppHeader isAdmin={isAdminUser(user)} />

      <section className="card overflow-hidden p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-emerald-800">今天先看这里</p>
            <h1 className="mt-1 text-3xl font-black">物品放哪、何时过期，一张图看清</h1>
          </div>
          <span className="text-4xl">🧊</span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-emerald-950 p-4 text-white"><div className="text-3xl font-black">{stats.activeCount}</div><div className="mt-1 text-sm text-emerald-100">有效物品</div></div>
          <div className="rounded-2xl bg-amber-100 p-4 text-amber-950"><div className="text-3xl font-black">{stats.expiringSoonCount}</div><div className="mt-1 text-sm">7 天内到期</div></div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link href="/items/new" className="button-primary">📷 添加物品</Link>
          <Link href="/spaces/new" className="button-secondary">＋ 新建空间</Link>
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-end justify-between"><h2 className="text-xl font-black">我的空间</h2><span className="muted text-sm">{spaces.length} 个</span></div>
        {spaces.length === 0 ? (
          <div className="card p-6 text-center">
            <div className="text-4xl">📍</div><h3 className="mt-3 text-lg font-bold">先创建一个真实存放位置</h3>
            <p className="muted mt-2 leading-6">上传厨房、冰箱或柜子图片，然后点击图片标记可存放物品的位置。</p>
            <Link href="/spaces/new" className="button-primary mt-5">创建第一个空间</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {spaces.map((space: SpaceView) => (
              <Link key={space.id} href={`/spaces/${space.id}`} className="card overflow-hidden transition hover:-translate-y-0.5">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  {space.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={space.imageUrl} alt={space.name} className="h-full w-full object-cover opacity-75 blur-[1px]" />
                  ) : <div className="grid h-full place-items-center text-4xl">🗄️</div>}
                  <div className="absolute inset-0 bg-white/25" />
                  <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-sm font-black shadow">{space.locations.length} 个位置</span>
                </div>
                <div className="p-4"><h3 className="font-black">{space.name}</h3><p className="muted mt-1 text-sm">点击查看和标记位置</p></div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-7">
        <h2 className="mb-3 text-xl font-black">最近录入</h2>
        {recentItems.length === 0 ? (
          <div className="card p-5 muted">还没有录入物品。</div>
        ) : (
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {recentItems.map((item: RecentItemView) => {
              const location = item.location as unknown;
              const space = location && typeof location === "object" && "space" in location ? (location as { space?: unknown }).space : null;
              return (
                <div key={item.id} className="flex items-center gap-3 p-4">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} className="h-12 w-12 rounded-xl object-cover" />
                  ) : <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-xl">📦</div>}
                  <div className="min-w-0 flex-1"><h3 className="truncate font-bold">{item.name}</h3><p className="muted mt-0.5 truncate text-xs">{relationName(space)} · {relationName(location)}</p></div>
                  <ExpiryBadge expireDate={item.expireDate} />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
