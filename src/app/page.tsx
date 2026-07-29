import Link from "next/link";

const questions = ["物品是什么？", "物品放在哪里？", "物品什么时候过期？"];

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-10 bg-stone-50 px-6 py-12 text-slate-900">
      <div className="space-y-4">
        <p className="text-sm font-semibold tracking-[0.2em] text-emerald-700">
          FRESHPIN
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          知道物品在哪，才不会错过它的保质期
        </h1>
        <p className="max-w-xl text-lg leading-8 text-slate-600">
          用真实空间图片标记物品位置，记录日期，并在临期前收到提醒。
        </p>
        <Link
          className="inline-flex rounded-full bg-emerald-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          href="/spaces"
        >
          管理我的空间
        </Link>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {questions.map((question, index) => (
          <li
            className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"
            key={question}
          >
            <span className="mb-3 block text-sm font-semibold text-emerald-700">
              0{index + 1}
            </span>
            <p className="font-medium">{question}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
