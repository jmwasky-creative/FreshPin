import { fail, ok, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { listSpaces } from "@/lib/data";
import { createSpaceSchema } from "@/lib/schemas";
import { assertOwnedImagePath } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    await requireUser();
    return ok(await listSpaces());
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = createSpaceSchema.parse(await request.json());
    assertOwnedImagePath(input.imagePath, user.id);
    const supabase = await createClient();
    const { data, error } = await supabase.from("spaces").insert({
      user_id: user.id,
      name: input.name,
      image_path: input.imagePath,
      image_width: input.imageWidth,
      image_height: input.imageHeight,
    }).select("id,name").single();
    if (error) throw new ApiError(`空间创建失败：${error.message}`, 500, "SPACE_CREATE_FAILED");
    return ok(data, 201);
  } catch (error) { return fail(error); }
}
