import { AppHeader } from "@/components/app-header";
import { LocalSpacePreview } from "@/components/local-space-preview";

export default function SpacesPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-sm font-semibold tracking-[0.2em] text-emerald-700">
          FRESHPIN
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">我的空间</h1>
        <p className="mt-4 max-w-lg leading-7 text-slate-600">
          下一步可上传冰箱、厨房或柜子的图片，再在图片上标记物品位置。
        </p>
        <LocalSpacePreview />
      </main>
    </div>
  );
}
