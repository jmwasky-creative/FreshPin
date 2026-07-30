"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RecognitionDraft, ShelfLifeUnit, SpaceView } from "@/types/domain";
import { addShelfLife, isIsoDate } from "@/lib/date";
import { apiJson, compressImage } from "@/lib/browser-image";

interface Props {
  spaces: SpaceView[];
  preferredSpaceId?: string;
}

export function ItemWizard({ spaces, preferredSpaceId }: Props) {
  const router = useRouter();
  const initialSpace = spaces.find((space) => space.id === preferredSpaceId) ?? spaces[0];
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<RecognitionDraft | null>(null);
  const [name, setName] = useState("");
  const [produceDate, setProduceDate] = useState("");
  const [shelfLifeValue, setShelfLifeValue] = useState("");
  const [shelfLifeUnit, setShelfLifeUnit] = useState<ShelfLifeUnit>("DAY");
  const [expireDate, setExpireDate] = useState("");
  const [expireWasEdited, setExpireWasEdited] = useState(false);
  const [dateUnknown, setDateUnknown] = useState(false);
  const [remindDaysBefore, setRemindDaysBefore] = useState("3");
  const [spaceId, setSpaceId] = useState(initialSpace?.id ?? "");
  const [locationId, setLocationId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  const selectedSpace = spaces.find((space) => space.id === spaceId) ?? spaces[0];
  const selectedLocation = selectedSpace?.locations.find((location) => location.id === locationId);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const calculatedExpireDate = useMemo(() => {
    const amount = Number(shelfLifeValue);
    if (!isIsoDate(produceDate) || !Number.isInteger(amount) || amount <= 0) return null;
    try { return addShelfLife(produceDate, amount, shelfLifeUnit); } catch { return null; }
  }, [produceDate, shelfLifeValue, shelfLifeUnit]);
  const effectiveExpireDate =
    !dateUnknown && !expireWasEdited && calculatedExpireDate
      ? calculatedExpireDate
      : expireDate;

  const dateConflict = Boolean(
    !dateUnknown
      && effectiveExpireDate
      && calculatedExpireDate
      && effectiveExpireDate !== calculatedExpireDate,
  );

  const canContinueDetails = useMemo(() => {
    if (!name.trim()) return false;
    if (dateUnknown) return true;
    return Boolean(effectiveExpireDate && isIsoDate(effectiveExpireDate));
  }, [name, dateUnknown, effectiveExpireDate]);

  function selectFile(nextFile: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const nextPreview = nextFile ? URL.createObjectURL(nextFile) : null;
    previewRef.current = nextPreview;
    setFile(nextFile);
    setPreview(nextPreview);
  }

  async function scanImage(event: FormEvent) {
    event.preventDefault();
    if (!file) return setError("请先拍摄或选择物品图片。");
    setBusy(true); setError(null);
    try {
      const compressed = await compressImage(file);
      if (compressed.blob.size > 5 * 1024 * 1024) throw new Error("图片超过 5MB，请更换图片。");
      const form = new FormData();
      form.append("kind", "item");
      form.append("file", compressed.blob, "item.jpg");
      const upload = await apiJson<{ imagePath: string }>("/api/uploads", { method: "POST", body: form });
      setImagePath(upload.imagePath);
      const result = await apiJson<RecognitionDraft>("/api/recognition/item", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imagePath: upload.imagePath }),
      });
      setRecognition(result);
      setName(result.name ?? "");
      setProduceDate(result.produceDate ?? "");
      setShelfLifeValue(result.shelfLife?.value ? String(result.shelfLife.value) : "");
      setShelfLifeUnit(result.shelfLife?.unit ?? "DAY");
      setExpireDate(result.expireDate ?? "");
      setExpireWasEdited(Boolean(result.expireDate));
      setStep(2);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "图片处理失败");
    } finally { setBusy(false); }
  }

  function confirmDetails(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!canContinueDetails) {
      setError("请填写物品名称和过期日期，或选择“日期未知”。");
      return;
    }
    setStep(3);
  }

  async function saveItem() {
    if (!locationId || !selectedSpace) return setError("请在图片上选择一个存放位置。");
    setBusy(true); setError(null);
    try {
      await apiJson<{ id: string }>("/api/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locationId,
          name: name.trim(),
          imagePath,
          produceDate: dateUnknown || !produceDate ? null : produceDate,
          shelfLifeValue: dateUnknown || !shelfLifeValue ? null : Number(shelfLifeValue),
          shelfLifeUnit: dateUnknown || !shelfLifeValue ? null : shelfLifeUnit,
          expireDate: dateUnknown || !effectiveExpireDate ? null : effectiveExpireDate,
          remindDaysBefore: Number(remindDaysBefore),
          sourceRawText: recognition?.rawText ?? null,
        }),
      });
      router.push(`/spaces/${selectedSpace.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存物品失败");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
        {[[1, "拍照"], [2, "确认信息"], [3, "选择位置"]].map(([value, label]) => (
          <div key={value} className={`rounded-full px-2 py-2 ${step >= Number(value) ? "bg-emerald-900 text-white" : "bg-slate-100 text-slate-500"}`}>{value}. {label}</div>
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={scanImage} className="card p-5 sm:p-7">
          <h1 className="text-2xl font-black">拍摄物品包装</h1>
          <p className="muted mt-2 leading-6">尽量让商品名称、生产日期和保质期清晰可见。识别不到也可以手动填写。</p>
          <input className="input mt-5 py-3" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
          {preview && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="物品图片预览" className="max-h-[52vh] w-full object-contain" />
            </div>
          )}
          {error && <div className="error-box mt-4 text-sm">{error}</div>}
          <button className="button-primary mt-5 w-full" disabled={busy}>{busy ? "上传并识别中…" : "开始识别"}</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={confirmDetails} className="card p-5 sm:p-7">
          <div className="flex items-start gap-4">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="物品" className="h-20 w-20 rounded-2xl object-cover" />
            )}
            <div><h1 className="text-2xl font-black">确认识别信息</h1><p className="muted mt-1 text-sm">AI 结果只是草稿，请以包装实际信息为准。</p></div>
          </div>
          {recognition?.warnings.map((warning) => <div key={warning} className="notice-box mt-4 text-sm">{warning}</div>)}
          <div className="mt-5 space-y-4">
            <div><label className="label" htmlFor="item-name">物品名称 *</label><input id="item-name" className="input" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：纯牛奶" /></div>
            <div><label className="label" htmlFor="produce-date">生产日期</label><input id="produce-date" className="input" type="date" disabled={dateUnknown} value={produceDate} onChange={(event) => setProduceDate(event.target.value)} /></div>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div><label className="label" htmlFor="shelf-life">保质期</label><input id="shelf-life" className="input" type="number" min="1" max="9999" disabled={dateUnknown} value={shelfLifeValue} onChange={(event) => setShelfLifeValue(event.target.value)} placeholder="例如 30" /></div>
              <div><label className="label" htmlFor="shelf-unit">单位</label><select id="shelf-unit" className="input" disabled={dateUnknown} value={shelfLifeUnit} onChange={(event) => setShelfLifeUnit(event.target.value as ShelfLifeUnit)}><option value="DAY">天</option><option value="MONTH">月</option><option value="YEAR">年</option></select></div>
            </div>
            <div><label className="label" htmlFor="expire-date">过期日期</label><input id="expire-date" className="input" type="date" disabled={dateUnknown} value={effectiveExpireDate} onChange={(event) => { setExpireDate(event.target.value); setExpireWasEdited(true); }} /><p className="muted mt-1 text-xs">填写生产日期和保质期后会自动计算；你仍可直接修改。</p></div>
            {dateConflict && <div className="notice-box text-sm">包装识别出的过期日期与系统计算结果（{calculatedExpireDate}）不一致。当前会保存“过期日期”输入框中的值，请核对包装后确认。</div>}
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4"><input type="checkbox" checked={dateUnknown} onChange={(event) => setDateUnknown(event.target.checked)} /><span><strong>日期未知</strong><small className="muted mt-0.5 block">该物品仍会保存，但不会发送过期提醒。</small></span></label>
            <div><label className="label" htmlFor="reminder-days">提前提醒天数</label><input id="reminder-days" className="input" type="number" min="0" max="365" required disabled={dateUnknown} value={remindDaysBefore} onChange={(event) => setRemindDaysBefore(event.target.value)} /></div>
          </div>
          {error && <div className="error-box mt-4 text-sm">{error}</div>}
          <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" className="button-secondary" onClick={() => setStep(1)}>重新拍摄</button><button className="button-primary">下一步：选择位置</button></div>
        </form>
      )}

      {step === 3 && selectedSpace && (
        <section className="card p-4 sm:p-6">
          <h1 className="text-2xl font-black">选择存放位置</h1>
          <p className="muted mt-2">切换空间，然后点击图片上的位置标记。</p>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {spaces.map((space) => <button key={space.id} type="button" className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${space.id === selectedSpace.id ? "bg-emerald-900 text-white" : "bg-slate-100 text-slate-700"}`} onClick={() => { setSpaceId(space.id); setLocationId(""); }}>{space.name}</button>)}
          </div>
          {selectedSpace.locations.length === 0 ? (
            <div className="notice-box mt-4 text-sm leading-6">这个空间还没有位置点。请先在空间页面点击图片创建位置，再返回继续录入。<div className="mt-3"><a href={`/spaces/${selectedSpace.id}`} className="font-bold underline">前往标记位置</a></div></div>
          ) : (
            <div className="relative mt-4 overflow-hidden rounded-[20px] bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedSpace.imageUrl} alt={selectedSpace.name} className="space-photo" />
              <div className="glass-overlay" />
              {selectedSpace.locations.map((location) => (
                <button key={location.id} type="button" onClick={() => setLocationId(location.id)} className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 px-3 py-2 text-xs font-black shadow-lg ${location.id === locationId ? "border-emerald-700 bg-emerald-900 text-white" : "border-white bg-white/95 text-emerald-950"}`} style={{ left: `${location.xRatio * 100}%`, top: `${location.yRatio * 100}%` }}>📍 {location.name}</button>
              ))}
            </div>
          )}
          {selectedLocation && <div className="notice-box mt-4">将 <strong>{name}</strong> 存放到：<strong>{selectedSpace.name} &gt; {selectedLocation.name}</strong></div>}
          {error && <div className="error-box mt-4 text-sm">{error}</div>}
          <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" className="button-secondary" onClick={() => setStep(2)}>返回修改</button><button type="button" className="button-primary" disabled={busy || !locationId} onClick={saveItem}>{busy ? "保存中…" : "存放到这里"}</button></div>
        </section>
      )}
    </div>
  );
}
