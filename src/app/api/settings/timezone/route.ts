import { fail, ok, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { isValidTimeZone } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({ timezone: z.string().min(1).max(80) });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { timezone } = schema.parse(await request.json());
    if (!isValidTimeZone(timezone)) {
      throw new ApiError("无效的时区。", 422, "INVALID_TIMEZONE");
    }
    const supabase = await createClient();
    const { error } = await supabase.from("user_settings").upsert({
      user_id: user.id,
      email: user.email ?? "",
      timezone,
    }, { onConflict: "user_id" });
    if (error) throw error;
    return ok({ timezone });
  } catch (error) { return fail(error); }
}
