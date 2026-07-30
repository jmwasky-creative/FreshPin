import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { ItemWizard } from "@/components/ItemWizard";
import { listSpaces } from "@/lib/data";

export default async function NewItemPage({ searchParams }: { searchParams: Promise<{ spaceId?: string }> }) {
  const { spaceId } = await searchParams;
  const spaces = await listSpaces();
  return (
    <main className="page-shell">
      <AppHeader title="添加物品" />
      {spaces.length === 0 ? (
        <section className="card p-6 text-center">
          <div className="text-4xl">📍</div>
          <h1 className="mt-3 text-2xl font-black">先创建一个存放空间</h1>
          <p className="muted mt-2 leading-6">物品保存前必须选择位置。先上传空间图片并标记一个位置点。</p>
          <Link href="/spaces/new" className="button-primary mt-5">创建空间</Link>
        </section>
      ) : (
        <ItemWizard spaces={spaces} preferredSpaceId={spaceId} />
      )}
    </main>
  );
}
