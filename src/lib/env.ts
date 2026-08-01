const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicSupabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasSupabasePublicEnv(): boolean {
  return Boolean(publicSupabaseUrl && publicSupabaseKey);
}

export function getSupabasePublicEnv(): { url: string; key: string } {
  if (!publicSupabaseUrl || !publicSupabaseKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return { url: publicSupabaseUrl, key: publicSupabaseKey };
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAdminBootstrapEnv(): { email: string; secret: string } {
  const email = requireEnv("ADMIN_EMAIL").trim().toLowerCase();
  const secret = requireEnv("ADMIN_BOOTSTRAP_SECRET");
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("ADMIN_EMAIL must be a valid email address.");
  }
  if (secret.length < 32) {
    throw new Error("ADMIN_BOOTSTRAP_SECRET must contain at least 32 characters.");
  }
  return { email, secret };
}

export function appName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME?.trim() || "KeepSpot";
}
