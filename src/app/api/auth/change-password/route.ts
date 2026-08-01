import { ApiError, fail, ok } from "@/lib/api";
import { FORCE_PASSWORD_CHANGE_KEY } from "@/lib/authz";
import { passwordSchema } from "@/lib/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { password } = passwordSchema.parse(await request.json());
    const supabase = await createClient();
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) throw new ApiError("请先登录。", 401, "UNAUTHORIZED");

    const { error } = await createAdminClient().auth.admin.updateUserById(data.user.id, {
      password,
      app_metadata: {
        ...data.user.app_metadata,
        [FORCE_PASSWORD_CHANGE_KEY]: false,
      },
    });
    if (error) throw new ApiError("密码修改失败，请稍后重试。", 500, "PASSWORD_CHANGE_FAILED");

    await supabase.auth.signOut();
    return ok({ changed: true });
  } catch (error) {
    return fail(error);
  }
}
