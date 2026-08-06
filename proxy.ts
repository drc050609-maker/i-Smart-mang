import { type NextRequest, NextResponse } from "next/server";

import {
  canStaffAccessPath,
  frontDeskHomePath,
  isFrontDeskStaffRole,
  isStaffRole,
} from "@/lib/staff-role";
import { updateSession } from "@/utils/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname.startsWith("/login");
  const isPublicRoute = pathname.startsWith("/trial");
  const isProtectedRoute =
    !isLoginPage &&
    !isPublicRoute &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/api");

  if (!user && isProtectedRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    const { data: staff } = await supabase
      .from("staff_accounts")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    const role =
      staff?.is_active && staff.role && isStaffRole(staff.role)
        ? staff.role
        : null;
    const isFrontDesk = role != null && isFrontDeskStaffRole(role);

    if (isLoginPage) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = isFrontDesk ? frontDeskHomePath() : "/";
      return NextResponse.redirect(homeUrl);
    }

    if (isFrontDesk && isProtectedRoute && !canStaffAccessPath(role, pathname)) {
      const hoursUrl = request.nextUrl.clone();
      hoursUrl.pathname = frontDeskHomePath();
      const redirect = NextResponse.redirect(hoursUrl);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirect.cookies.set(cookie.name, cookie.value);
      });
      return redirect;
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
