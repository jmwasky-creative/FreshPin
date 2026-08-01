import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { mustChangePassword } from "@/lib/authz";
import { getSupabasePublicEnv, hasSupabasePublicEnv } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const { url, key } = getSupabasePublicEnv();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const pathname = request.nextUrl.pathname;
  const isPublic = pathname === "/login" || pathname === "/reset-password" || pathname.startsWith("/auth/");
  const isApi = pathname.startsWith("/api/");
  const allowsPasswordChange = pathname === "/change-password" || pathname === "/api/auth/change-password";

  if (!user && !isPublic && !isApi) {
    const urlToLogin = request.nextUrl.clone();
    urlToLogin.pathname = "/login";
    urlToLogin.searchParams.set("next", pathname);
    return NextResponse.redirect(urlToLogin);
  }

  if (user && mustChangePassword(user) && !allowsPasswordChange) {
    const changePassword = request.nextUrl.clone();
    changePassword.pathname = "/change-password";
    changePassword.search = "";
    return NextResponse.redirect(changePassword);
  }

  if (user && pathname === "/login") {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return response;
}
