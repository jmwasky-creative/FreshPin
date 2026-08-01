import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeRedirectPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

const supportedTypes = new Set<EmailOtpType>(["email", "recovery", "email_change"]);

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const candidateType = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const loginUrl = new URL("/login", request.url);
  if (!tokenHash || !candidateType || !supportedTypes.has(candidateType)) {
    loginUrl.searchParams.set("authError", "1");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: candidateType });
  if (error) {
    loginUrl.searchParams.set("authError", "1");
    return NextResponse.redirect(loginUrl);
  }

  const destination = candidateType === "recovery"
    ? "/reset-password"
    : safeRedirectPath(request.nextUrl.searchParams.get("next"));
  return NextResponse.redirect(new URL(destination, request.url));
}
