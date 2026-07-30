import { fail, ok, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { detectImageMime } from "@/lib/image";
import { bucketForKind } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const allowed = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const kind = String(form.get("kind") ?? "");
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError("请选择要上传的图片。", 422, "FILE_REQUIRED");
    const extension = allowed.get(file.type);
    if (!extension) throw new ApiError("仅支持 JPEG、PNG 和 WebP 图片。", 415, "UNSUPPORTED_IMAGE");
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) throw new ApiError("图片大小必须在 5MB 以内。", 413, "IMAGE_TOO_LARGE");
    const detectedMime = detectImageMime(new Uint8Array(await file.arrayBuffer()));
    if (detectedMime !== file.type) {
      throw new ApiError(
        "图片内容与文件类型不匹配。",
        415,
        "INVALID_IMAGE_CONTENT",
      );
    }

    const bucket = bucketForKind(kind);
    const path = `${user.id}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
    const supabase = await createClient();
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw new ApiError(`图片上传失败：${error.message}`, 500, "UPLOAD_FAILED");
    return ok({ imagePath: path }, 201);
  } catch (error) {
    return fail(error);
  }
}
