export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
}

export async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<CompressedImage> {
  if (!file.type.startsWith("image/")) throw new Error("请选择图片文件");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法处理图片");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("图片压缩失败"))),
      "image/jpeg",
      quality,
    );
  });
  return { blob, width, height };
}

export async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error?.message || "请求失败，请稍后重试");
  }
  return body.data as T;
}
