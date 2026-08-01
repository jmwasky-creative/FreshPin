import { ApiError, fail, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { createInviteCode } from "@/lib/invite";
import { createInviteSchema } from "@/lib/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const input = createInviteSchema.parse(await request.json());
    const invite = createInviteCode();
    const expiresAt = input.expiresAt ? new Date(input.expiresAt).toISOString() : null;
    const { data, error } = await createAdminClient()
      .from("invite_codes")
      .insert({
        code_hash: invite.codeHash,
        created_by: user.id,
        expires_at: expiresAt,
      })
      .select("id,status,created_at,disabled_at,used_at,expires_at")
      .single();
    if (error) throw new ApiError("邀请码创建失败，请稍后重试。", 500, "INVITE_CREATE_FAILED");

    return ok({
      code: invite.code,
      invite: {
        id: data.id,
        status: data.status,
        createdAt: data.created_at,
        disabledAt: data.disabled_at,
        usedAt: data.used_at,
        expiresAt: data.expires_at,
      },
    }, 201);
  } catch (error) {
    return fail(error);
  }
}
