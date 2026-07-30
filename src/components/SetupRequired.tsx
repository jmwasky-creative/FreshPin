export function SetupRequired() {
  return (
    <main className="page-shell">
      <section className="card p-6 sm:p-8">
        <div className="mb-4 text-4xl">🧰</div>
        <h1 className="text-2xl font-bold">项目代码已启动，等待环境配置</h1>
        <p className="muted mt-3 leading-7">
          复制 <code>.env.example</code> 为 <code>.env.local</code>，填写 Supabase 配置，并在 Supabase SQL Editor 执行迁移文件。
        </p>
        <div className="notice-box mt-5 text-sm leading-6">
          迁移文件：<code>supabase/migrations/001_initial.sql</code>
        </div>
      </section>
    </main>
  );
}
