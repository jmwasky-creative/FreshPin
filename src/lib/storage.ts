import { ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

export type ImageBucket = "space-images" | "item-images";

export function createBrowserImageUrl(bucket: ImageBucket, path: string | null): string | null {
  if (!path) return null;
  const params = new URLSearchParams({ bucket, path });
  return `/api/images?${params.toString()}`;
}

export function assertOwnedImagePath(
  path: string | null,
  userId: string,
): void {
  if (!path) return;
  const segments = path.split("/");
  if (
    segments[0] !== userId
    || segments.length < 2
    || segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new ApiError("图片不属于当前用户。", 403, "FORBIDDEN_IMAGE");
  }
}

export async function createSignedImageUrl(
  bucket: ImageBucket,
  path: string | null,
  expiresIn = 60 * 60,
): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) {
    console.warn("Unable to create signed image URL", { bucket, path, error: error.message });
    return null;
  }
  return data.signedUrl;
}

export async function downloadImage(bucket: ImageBucket, path: string): Promise<Blob> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) throw new ApiError("无法读取图片，请重新上传。", 404, "IMAGE_NOT_FOUND");
  return data;
}

export function bucketForKind(kind: string): ImageBucket {
  if (kind === "space") return "space-images";
  if (kind === "item") return "item-images";
  throw new ApiError("不支持的图片类型。", 422, "INVALID_IMAGE_KIND");
}
