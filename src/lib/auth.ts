import type { User } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { isAdminUser, mustChangePassword } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("请先登录。", 401, "UNAUTHORIZED");
  if (mustChangePassword(user)) {
    throw new ApiError("请先修改初始密码。", 403, "PASSWORD_CHANGE_REQUIRED");
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!isAdminUser(user)) throw new ApiError("需要管理员权限。", 403, "FORBIDDEN");
  return user;
}
