import { fail, ok, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { calculateExpireDate } from "@/lib/date";
import { createItemSchema } from "@/lib/schemas";
import { assertOwnedImagePath } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "ACTIVE";
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("items")
      .select("id,name,image_path,produce_date,shelf_life_value,shelf_life_unit,expire_date,remind_days_before,status,created_at,location:locations(id,name,space:spaces(id,name))")
      .eq("user_id", user.id)
      .eq("status", status)
      .order("created_at", { ascending: false });
    if (error) throw new ApiError(error.message, 500, "ITEM_LIST_FAILED");
    return ok(data ?? []);
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = createItemSchema.parse(await request.json());
    const supabase = await createClient();
    const { data: location } = await supabase.from("locations").select("id").eq("id", input.locationId).eq("user_id", user.id).maybeSingle();
    if (!location) throw new ApiError("存放位置不存在。", 404, "LOCATION_NOT_FOUND");
    assertOwnedImagePath(input.imagePath, user.id);

    const expireDate = calculateExpireDate({
      produceDate: input.produceDate,
      shelfLifeValue: input.shelfLifeValue,
      shelfLifeUnit: input.shelfLifeUnit,
      expireDate: input.expireDate,
    });

    const { data, error } = await supabase.from("items").insert({
      user_id: user.id,
      location_id: input.locationId,
      name: input.name,
      image_path: input.imagePath,
      produce_date: input.produceDate,
      shelf_life_value: input.shelfLifeValue,
      shelf_life_unit: input.shelfLifeUnit,
      expire_date: expireDate,
      remind_days_before: input.remindDaysBefore,
      source_raw_text: input.sourceRawText,
      status: "ACTIVE",
    }).select("id,name,expire_date").single();
    if (error) throw new ApiError(error.message, 500, "ITEM_CREATE_FAILED");
    return ok(data, 201);
  } catch (error) { return fail(error); }
}
