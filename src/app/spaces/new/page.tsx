import { AppHeader } from "@/components/AppHeader";
import { NewSpaceForm } from "@/components/NewSpaceForm";

export default function NewSpacePage() {
  return (
    <main className="page-shell">
      <AppHeader title="新建空间" />
      <section className="card p-5 sm:p-7">
        <h1 className="text-2xl font-black">拍一张存放空间</h1>
        <p className="muted mt-2 leading-6">可以是厨房、冰箱内部、柜子或药箱。第一版每张图片作为一个独立空间。</p>
        <div className="mt-6"><NewSpaceForm /></div>
      </section>
    </main>
  );
}
