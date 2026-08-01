import { timingSafeEqual } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { ADMIN_ROLE, FORCE_PASSWORD_CHANGE_KEY, isAdminUser } from "@/lib/authz";
import { getAdminBootstrapEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const DEFAULT_ADMIN_PASSWORD = "112233";

function safeSecretEqual(received: string | null, expected: string): boolean {
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function hasValidBootstrapAuthorization(header: string | null): boolean {
  const { secret } = getAdminBootstrapEnv();
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
  return safeSecretEqual(token, secret);
}

function adminMetadata(user?: Pick<User, "app_metadata">): Record<string, unknown> {
  const existing = user?.app_metadata ?? {};
  return {
    ...existing,
    role: ADMIN_ROLE,
    [FORCE_PASSWORD_CHANGE_KEY]: isAdminUser(user)
      ? existing[FORCE_PASSWORD_CHANGE_KEY] !== false
      : true,
  };
}

export async function bootstrapAdministrator(): Promise<"created" | "updated"> {
  const { email } = getAdminBootstrapEnv();
  const admin = createAdminClient();
  const { data: users, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;

  const existing = users.users.find((user) => user.email?.toLowerCase() === email);
  if (existing) {
    const update: {
      password?: string;
      email_confirm?: boolean;
      app_metadata: Record<string, unknown>;
    } = {
      app_metadata: adminMetadata(existing),
    };
    // An older OTP account may already exist before bootstrap. If it is still
    // marked for the mandatory first password change, initialize its password
    // as well; once the flag is cleared, never overwrite the user's password.
    if (existing.app_metadata?.[FORCE_PASSWORD_CHANGE_KEY] === true) {
      update.password = DEFAULT_ADMIN_PASSWORD;
      update.email_confirm = true;
    }
    const { error } = await admin.auth.admin.updateUserById(existing.id, update);
    if (error) throw error;
    return "updated";
  }

  const { error } = await admin.auth.admin.createUser({
    email,
    password: DEFAULT_ADMIN_PASSWORD,
    email_confirm: true,
    app_metadata: adminMetadata(),
  });
  if (error) throw error;
  return "created";
}
