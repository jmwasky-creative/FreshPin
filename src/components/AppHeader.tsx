import Link from "next/link";
import { appName } from "@/lib/env";
import { SignOutButton } from "@/components/SignOutButton";

export function AppHeader({ title }: { title?: string }) {
  return (
    <header className="mb-5 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-900 text-lg text-white">⌖</span>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[.18em] text-emerald-800">{appName()}</div>
          <div className="font-bold">{title ?? "我的物品"}</div>
        </div>
      </Link>
      <SignOutButton />
    </header>
  );
}
