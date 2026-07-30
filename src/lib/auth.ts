import type { User } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
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
  return user;
}
