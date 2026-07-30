import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { SpaceCanvas } from "@/components/SpaceCanvas";
import { getSpace } from "@/lib/data";

export default async function SpacePage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await params;
  const space = await getSpace(spaceId);
  if (!space) notFound();
  return (
    <main className="page-shell">
      <AppHeader title="空间详情" />
      {!space.imageUrl ? (
        <div className="error-box">空间图片暂时无法读取，请刷新页面或重新创建空间。</div>
      ) : (
        <SpaceCanvas initialSpace={space} />
      )}
    </main>
  );
}
