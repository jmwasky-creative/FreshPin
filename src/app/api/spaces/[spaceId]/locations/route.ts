import { fail, ok, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createLocationSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  try {
    const user = await requireUser();
    const { spaceId } = await params;
    const input = createLocationSchema.parse(await request.json());
    const supabase = await createClient();
    const { data: space } = await supabase.from("spaces").select("id").eq("id", spaceId).eq("user_id", user.id).maybeSingle();
    if (!space) throw new ApiError("空间不存在。", 404, "SPACE_NOT_FOUND");
    const { data, error } = await supabase.from("locations").insert({
      user_id: user.id,
      space_id: spaceId,
      name: input.name,
      x_ratio: input.xRatio,
      y_ratio: input.yRatio,
    }).select("id,name,x_ratio,y_ratio").single();
    if (error) throw new ApiError(error.message, 500, "LOCATION_CREATE_FAILED");
    return ok({ id: data.id, name: data.name, xRatio: Number(data.x_ratio), yRatio: Number(data.y_ratio) }, 201);
  } catch (error) { return fail(error); }
}
