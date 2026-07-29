import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-slate-200 bg-white px-5 py-4">
      <Link
        aria-label="返回首页"
        className="inline-flex items-center gap-2 rounded-sm font-semibold tracking-tight text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
        href="/"
      >
        <span aria-hidden="true">FreshPin</span>
        <span>返回首页</span>
      </Link>
    </header>
  );
}
