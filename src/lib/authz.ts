import type { User } from "@supabase/supabase-js";

export const ADMIN_ROLE = "admin";
export const FORCE_PASSWORD_CHANGE_KEY = "must_change_password";

export function isAdminUser(user: Pick<User, "app_metadata"> | null | undefined): boolean {
  return user?.app_metadata?.role === ADMIN_ROLE;
}

export function mustChangePassword(user: Pick<User, "app_metadata"> | null | undefined): boolean {
  return user?.app_metadata?.[FORCE_PASSWORD_CHANGE_KEY] === true;
}
