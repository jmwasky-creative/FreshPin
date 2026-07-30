import { fail, ok, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { recognizeItem } from "@/lib/recognition/client";
import {
  assertOwnedImagePath,
  createSignedImageUrl,
  downloadImage,
} from "@/lib/storage";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({ imagePath: z.string().min(3).max(500) });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { imagePath } = schema.parse(await request.json());
    assertOwnedImagePath(imagePath, user.id);
    const [image, signedImageUrl] = await Promise.all([
      downloadImage("item-images", imagePath),
      createSignedImageUrl("item-images", imagePath, 10 * 60),
    ]);
    if (!signedImageUrl) throw new ApiError("无法生成图片访问地址。", 500, "SIGNED_URL_FAILED");
    return ok(await recognizeItem({ image, signedImageUrl }));
  } catch (error) { return fail(error); }
}
