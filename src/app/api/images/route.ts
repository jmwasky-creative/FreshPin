import { fail, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { assertOwnedImagePath, type ImageBucket } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function imageBucket(value: string | null): ImageBucket {
  if (value === "space-images" || value === "item-images") return value;
  throw new ApiError("不支持的图片类型。", 422, "INVALID_IMAGE_BUCKET");
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const bucket = imageBucket(url.searchParams.get("bucket"));
    const path = url.searchParams.get("path");
    if (!path || path.length > 500) throw new ApiError("图片地址无效。", 422, "INVALID_IMAGE_PATH");
    assertOwnedImagePath(path, user.id);

    const { data, error } = await (await createClient()).storage.from(bucket).download(path);
    if (error || !data) throw new ApiError("图片不存在或无法读取。", 404, "IMAGE_NOT_FOUND");

    return new Response(data, {
      headers: {
        "Content-Type": data.type || "application/octet-stream",
        // Private browser cache: the URL is user/path scoped and the signed
        // session is still checked on the first request.
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
