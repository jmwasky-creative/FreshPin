import { ApiError, fail, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { disableInviteSchema } from "@/lib/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ inviteId: string }> },
) {
  try {
    await requireAdmin();
    const { inviteId } = disableInviteSchema.parse(await params);
    const { data, error } = await createAdminClient()
      .from("invite_codes")
      .update({ status: "DISABLED", disabled_at: new Date().toISOString() })
      .eq("id", inviteId)
      .eq("status", "ACTIVE")
      .is("used_by", null)
      .select("id,status,created_at,disabled_at,used_at,expires_at")
      .maybeSingle();
    if (error) throw new ApiError("邀请码停用失败，请稍后重试。", 500, "INVITE_DISABLE_FAILED");
    if (!data) throw new ApiError("邀请码不存在、已使用或已停用。", 404, "INVITE_NOT_ACTIVE");

    return ok({
      id: data.id,
      status: data.status,
      createdAt: data.created_at,
      disabledAt: data.disabled_at,
      usedAt: data.used_at,
      expiresAt: data.expires_at,
    });
  } catch (error) {
    return fail(error);
  }
}
