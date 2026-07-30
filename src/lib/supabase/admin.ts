import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, requireEnv } from "@/lib/env";

export function createAdminClient() {
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
