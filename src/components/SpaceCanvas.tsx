"use client";

import Link from "next/link";
import { FormEvent, MouseEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LocationView, SpaceView } from "@/types/domain";
import { apiJson } from "@/lib/browser-image";
import { ExpiryBadge } from "@/components/ExpiryBadge";

export function SpaceCanvas({ initialSpace }: { initialSpace: SpaceView }) {
  const router = useRouter();
  const [locations, setLocations] = useState(initialSpace.locations);
  const [draft, setDraft] = useState<{ xRatio: number; yRatio: number } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = useMemo(() => locations.find((location) => location.id === selectedId) ?? null, [locations, selectedId]);

  function choosePoint(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("[data-location-marker]")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const xRatio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const yRatio = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    setDraft({ xRatio, yRatio });
    setLocationName("");
    setError(null);
  }

  async function createLocation(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true); setError(null);
    try {
      const created = await apiJson<{ id: string; name: string; xRatio: number; yRatio: number }>(`/api/spaces/${initialSpace.id}/locations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: locationName, ...draft }),
      });
      const location: LocationView = { ...created, items: [] };
      setLocations((current) => [...current, location]);
      setDraft(null);
      setSelectedId(location.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "创建位置失败");
    } finally { setBusy(false); }
  }

  async function deleteLocation() {
    if (!selected || selected.items.length > 0) return;
    if (!window.confirm(`删除位置“${selected.name}”？`)) return;
    setBusy(true); setError(null);
    try {
      await apiJson(`/api/locations/${selected.id}`, { method: "DELETE" });
      setLocations((current) => current.filter((location) => location.id !== selected.id));
      setSelectedId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "删除失败");
    } finally { setBusy(false); }
  }

  async function markItem(itemId: string, action: "use" | "discard") {
    setBusy(true); setError(null);
    try {
      await apiJson(`/api/items/${itemId}/${action}`, { method: "POST" });
      setLocations((current) => current.map((location) => ({
        ...location,
        items: location.items.filter((item) => item.id !== itemId),
      })));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "操作失败");
    } finally { setBusy(false); }
  }

  return (
    <>
      <div className="card overflow-hidden p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div>
            <h1 className="text-xl font-black">{initialSpace.name}</h1>
            <p className="muted mt-1 text-sm">点击图片空白处创建位置；点击已有标记查看物品。</p>
          </div>
          <Link className="button-primary shrink-0" href={`/items/new?spaceId=${initialSpace.id}`}>＋ 添加物品</Link>
        </div>
        <div className="relative cursor-crosshair overflow-hidden rounded-[20px] bg-slate-100" onClick={choosePoint}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={initialSpace.imageUrl} alt={initialSpace.name} className="space-photo select-none" draggable={false} />
          <div className="glass-overlay" />
          {locations.map((location) => {
            const visible = location.items.slice(0, 3);
            const extra = Math.max(0, location.items.length - visible.length);
            return (
              <button
                key={location.id}
                data-location-marker
                type="button"
                aria-label={`查看位置 ${location.name}`}
                onClick={(event) => { event.stopPropagation(); setSelectedId(location.id); setError(null); }}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/80 bg-white/95 p-2 text-left shadow-lg transition hover:scale-105"
                style={{ left: `${location.xRatio * 100}%`, top: `${location.yRatio * 100}%` }}
              >
                <div className="mb-1 max-w-28 truncate text-xs font-black text-emerald-950">📍 {location.name}</div>
                {visible.length > 0 ? (
                  <div className="flex items-center -space-x-2">
                    {visible.map((item) => item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={item.id} src={item.imageUrl} alt={item.name} className="h-8 w-8 rounded-full border-2 border-white object-cover" />
                    ) : (
                      <span key={item.id} className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-emerald-100 text-xs">📦</span>
                    ))}
                    {extra > 0 && <span className="grid h-8 min-w-8 place-items-center rounded-full border-2 border-white bg-slate-800 px-1 text-[10px] font-bold text-white">+{extra}</span>}
                  </div>
                ) : <span className="text-[11px] text-slate-500">暂无物品</span>}
              </button>
            );
          })}
          {draft && <div className="pointer-events-none absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-4 border-white bg-emerald-700 shadow" style={{ left: `${draft.xRatio * 100}%`, top: `${draft.yRatio * 100}%` }} />}
        </div>
      </div>

      {draft && (
        <div className="fixed inset-0 z-40 grid place-items-end bg-slate-950/35 p-3 sm:place-items-center" onClick={() => !busy && setDraft(null)}>
          <form className="card safe-bottom w-full max-w-md p-5" onSubmit={createLocation} onClick={(event) => event.stopPropagation()}>
            <h2 className="text-xl font-black">标记存放位置</h2>
            <p className="muted mt-1 text-sm">给刚才点击的位置起一个容易识别的名称。</p>
            <label className="label mt-5" htmlFor="location-name">位置名称</label>
            <input id="location-name" className="input" autoFocus required maxLength={50} value={locationName} onChange={(event) => setLocationName(event.target.value)} placeholder="例如：冷藏第一层" />
            {error && <div className="error-box mt-3 text-sm">{error}</div>}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" className="button-secondary" disabled={busy} onClick={() => setDraft(null)}>取消</button>
              <button className="button-primary" disabled={busy}>{busy ? "保存中…" : "保存位置"}</button>
            </div>
          </form>
        </div>
      )}

      {selected && !draft && (
        <div className="fixed inset-0 z-30 flex items-end bg-slate-950/25" onClick={() => setSelectedId(null)}>
          <section className="safe-bottom max-h-[72vh] w-full overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="mx-auto max-w-2xl">
              <div className="flex items-start justify-between gap-4">
                <div><h2 className="text-2xl font-black">{selected.name}</h2><p className="muted mt-1">{selected.items.length} 件有效物品</p></div>
                <button className="text-2xl text-slate-400" onClick={() => setSelectedId(null)} aria-label="关闭">×</button>
              </div>
              {error && <div className="error-box mt-4 text-sm">{error}</div>}
              <div className="mt-5 space-y-3">
                {selected.items.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-5 text-center muted">这里还没有物品。</div>
                ) : selected.items.map((item) => (
                  <article key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.name} className="h-14 w-14 rounded-xl object-cover" />
                    ) : <div className="grid h-14 w-14 place-items-center rounded-xl bg-slate-100 text-2xl">📦</div>}
                    <div className="min-w-0 flex-1"><h3 className="truncate font-bold">{item.name}</h3><div className="mt-1"><ExpiryBadge expireDate={item.expireDate} /></div></div>
                    <div className="flex flex-col gap-1 text-xs font-bold">
                      <button className="rounded-lg bg-emerald-50 px-2 py-1.5 text-emerald-800" disabled={busy} onClick={() => markItem(item.id, "use")}>已使用</button>
                      <button className="rounded-lg bg-red-50 px-2 py-1.5 text-red-700" disabled={busy} onClick={() => markItem(item.id, "discard")}>已丢弃</button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="mt-5 flex gap-3">
                <Link href={`/items/new?spaceId=${initialSpace.id}`} className="button-primary flex-1">添加物品到这里</Link>
                {selected.items.length === 0 && <button className="button-danger" disabled={busy} onClick={deleteLocation}>删除位置</button>}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
