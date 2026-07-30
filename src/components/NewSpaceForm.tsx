"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson, compressImage } from "@/lib/browser-image";

export function NewSpaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  function selectFile(nextFile: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const nextPreview = nextFile ? URL.createObjectURL(nextFile) : null;
    previewRef.current = nextPreview;
    setFile(nextFile);
    setPreview(nextPreview);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return setError("请先拍摄或选择空间图片。");
    setBusy(true); setError(null);
    try {
      const compressed = await compressImage(file);
      if (compressed.blob.size > 5 * 1024 * 1024) throw new Error("压缩后的图片仍超过 5MB，请更换图片。");
      const form = new FormData();
      form.append("kind", "space");
      form.append("file", compressed.blob, "space.jpg");
      const upload = await apiJson<{ imagePath: string }>("/api/uploads", { method: "POST", body: form });
      const space = await apiJson<{ id: string }>("/api/spaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, imagePath: upload.imagePath, imageWidth: compressed.width, imageHeight: compressed.height }),
      });
      router.push(`/spaces/${space.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className="label" htmlFor="space-name">空间名称</label>
        <input id="space-name" className="input" maxLength={50} required value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：厨房、冰箱内部、药箱" />
      </div>
      <div>
        <label className="label" htmlFor="space-image">空间图片</label>
        <input id="space-image" className="input py-3" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required onChange={(e) => selectFile(e.target.files?.[0] ?? null)} />
      </div>
      {preview && (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="空间预览" className="space-photo" />
          <div className="glass-overlay" />
          <div className="absolute inset-x-4 bottom-4 rounded-xl bg-white/90 p-3 text-sm font-semibold">保存后点击图片，标记可以存放物品的位置。</div>
        </div>
      )}
      {error && <div className="error-box text-sm">{error}</div>}
      <button className="button-primary w-full" disabled={busy}>{busy ? "正在创建…" : "创建空间并标记位置"}</button>
    </form>
  );
}
