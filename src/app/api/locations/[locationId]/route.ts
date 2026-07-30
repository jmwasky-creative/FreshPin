import { fail, ok, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ locationId: string }> }) {
  try {
    const user = await requireUser();
    const { locationId } = await params;
    const supabase = await createClient();
    const { count } = await supabase.from("items").select("id", { count: "exact", head: true }).eq("location_id", locationId).eq("user_id", user.id);
    if ((count ?? 0) > 0) throw new ApiError("该位置仍有物品，不能删除。", 409, "LOCATION_NOT_EMPTY");
    const { error } = await supabase.from("locations").delete().eq("id", locationId).eq("user_id", user.id);
    if (error) throw new ApiError(error.message, 500, "LOCATION_DELETE_FAILED");
    return ok({ deleted: true });
  } catch (error) { return fail(error); }
}
