import { fail, ok, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const user = await requireUser();
    const { itemId } = await params;
    const supabase = await createClient();
    const { data, error } = await supabase.from("items").update({ status: "USED" }).eq("id", itemId).eq("user_id", user.id).select("id,status").maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError("物品不存在。", 404, "ITEM_NOT_FOUND");
    return ok(data);
  } catch (error) { return fail(error); }
}
