import Link from "next/link";
import { appName } from "@/lib/env";
import { HomeBackLink } from "@/components/HomeBackLink";
import { SignOutButton } from "@/components/SignOutButton";

export function AppHeader({ title, isAdmin = false }: { title?: string; isAdmin?: boolean }) {
  return (
    <header className="mb-5 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-900 text-lg text-white">⌖</span>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[.18em] text-emerald-800">{appName()}</div>
          <div className="font-bold">{title ?? "我的物品"}</div>
        </div>
      </Link>
      <div className="flex items-center gap-3">
        {isAdmin && <Link href="/admin/invites" className="text-sm font-bold text-emerald-800">邀请码</Link>}
        {title && <HomeBackLink />}
        <SignOutButton />
      </div>
    </header>
  );
}
