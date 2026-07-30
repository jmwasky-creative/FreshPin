import { fail, ok, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getSpace } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  try {
    await requireUser();
    const { spaceId } = await params;
    const space = await getSpace(spaceId);
    if (!space) throw new ApiError("空间不存在。", 404, "SPACE_NOT_FOUND");
    return ok(space);
  } catch (error) { return fail(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  try {
    const user = await requireUser();
    const { spaceId } = await params;
    const supabase = await createClient();
    const { data: locations, error: locationError } = await supabase.from("locations").select("id").eq("space_id", spaceId).eq("user_id", user.id);
    if (locationError) throw locationError;
    const ids = (locations ?? []).map((location: { id: string }) => location.id);
    if (ids.length) {
      const { count } = await supabase.from("items").select("id", { count: "exact", head: true }).in("location_id", ids);
      if ((count ?? 0) > 0) throw new ApiError("空间内仍有物品，请先处理物品。", 409, "SPACE_NOT_EMPTY");
    }
    const { data: space } = await supabase.from("spaces").select("image_path").eq("id", spaceId).eq("user_id", user.id).maybeSingle();
    if (!space) throw new ApiError("空间不存在。", 404, "SPACE_NOT_FOUND");
    const { error } = await supabase.from("spaces").delete().eq("id", spaceId).eq("user_id", user.id);
    if (error) throw new ApiError(error.message, 500, "SPACE_DELETE_FAILED");
    await supabase.storage.from("space-images").remove([space.image_path]);
    return ok({ deleted: true });
  } catch (error) { return fail(error); }
}
