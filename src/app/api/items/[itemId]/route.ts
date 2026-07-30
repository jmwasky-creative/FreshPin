import { fail, ok, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { calculateExpireDate } from "@/lib/date";
import { patchItemSchema } from "@/lib/schemas";
import { assertOwnedImagePath } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const user = await requireUser();
    const { itemId } = await params;
    const supabase = await createClient();
    const { data, error } = await supabase.from("items").select("*,location:locations(id,name,space:spaces(id,name))").eq("id", itemId).eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError("物品不存在。", 404, "ITEM_NOT_FOUND");
    return ok(data);
  } catch (error) { return fail(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const user = await requireUser();
    const { itemId } = await params;
    const input = patchItemSchema.parse(await request.json());
    const supabase = await createClient();
    if (input.imagePath !== undefined) {
      assertOwnedImagePath(input.imagePath, user.id);
    }
    if (input.locationId) {
      const { data: location } = await supabase.from("locations").select("id").eq("id", input.locationId).eq("user_id", user.id).maybeSingle();
      if (!location) throw new ApiError("存放位置不存在。", 404, "LOCATION_NOT_FOUND");
    }
    const existingResult = await supabase.from("items").select("produce_date,shelf_life_value,shelf_life_unit,expire_date").eq("id", itemId).eq("user_id", user.id).maybeSingle();
    if (!existingResult.data) throw new ApiError("物品不存在。", 404, "ITEM_NOT_FOUND");
    const merged = {
      produceDate: input.produceDate === undefined ? existingResult.data.produce_date : input.produceDate,
      shelfLifeValue: input.shelfLifeValue === undefined ? existingResult.data.shelf_life_value : input.shelfLifeValue,
      shelfLifeUnit: input.shelfLifeUnit === undefined ? existingResult.data.shelf_life_unit : input.shelfLifeUnit,
      expireDate: input.expireDate === undefined ? existingResult.data.expire_date : input.expireDate,
    };
    const update: Record<string, unknown> = {};
    if (input.locationId !== undefined) update.location_id = input.locationId;
    if (input.name !== undefined) update.name = input.name;
    if (input.imagePath !== undefined) update.image_path = input.imagePath;
    if (input.produceDate !== undefined) update.produce_date = input.produceDate;
    if (input.shelfLifeValue !== undefined) update.shelf_life_value = input.shelfLifeValue;
    if (input.shelfLifeUnit !== undefined) update.shelf_life_unit = input.shelfLifeUnit;
    if (input.remindDaysBefore !== undefined) update.remind_days_before = input.remindDaysBefore;
    if (input.sourceRawText !== undefined) update.source_raw_text = input.sourceRawText;
    update.expire_date = calculateExpireDate(merged);
    const { data, error } = await supabase.from("items").update(update).eq("id", itemId).eq("user_id", user.id).select("id,name,expire_date").single();
    if (error) throw new ApiError(error.message, 500, "ITEM_UPDATE_FAILED");
    return ok(data);
  } catch (error) { return fail(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const user = await requireUser();
    const { itemId } = await params;
    const supabase = await createClient();
    const { data: item } = await supabase.from("items").select("image_path").eq("id", itemId).eq("user_id", user.id).maybeSingle();
    if (!item) throw new ApiError("物品不存在。", 404, "ITEM_NOT_FOUND");
    const { error } = await supabase.from("items").delete().eq("id", itemId).eq("user_id", user.id);
    if (error) throw new ApiError(error.message, 500, "ITEM_DELETE_FAILED");
    if (item.image_path) await supabase.storage.from("item-images").remove([item.image_path]);
    return ok({ deleted: true });
  } catch (error) { return fail(error); }
}
