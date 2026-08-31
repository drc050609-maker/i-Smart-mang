import { type NextRequest, NextResponse } from "next/server";

import {
  canStaffAccessPath,
  frontDeskHomePath,
  isFrontDeskStaffRole,
  isStaffRole,
} from "@/lib/staff-role";
import { updateSession } from "@/utils/supabase/middleware";

// Set to false and redeploy to bring the site back. Database data is unchanged.
const MAINTENANCE_MODE = true;

function maintenanceNotFound() {
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>404: This page could not be found.</title>
  </head>
  <body style="margin:0;background:#fff;color:#000;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;height:100vh;display:flex;align-items:center;justify-content:center">
    <div>
      <h1 style="display:inline-block;border-right:1px solid rgba(0,0,0,.3);margin:0 20px 0 0;padding:0 23px 0 0;font-size:24px;font-weight:500;vertical-align:top;line-height:49px">404</h1>
      <div style="display:inline-block;text-align:left;line-height:49px;height:49px;vertical-align:middle">
        <h2 style="font-size:14px;font-weight:400;line-height:49px;margin:0">This page could not be found.</h2>
      </div>
    </div>
  </body>
</html>`,
    {
      status: 404,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

export async function proxy(request: NextRequest) {
  if (MAINTENANCE_MODE) {
    return maintenanceNotFound();
  }

  const { supabaseResponse, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname.startsWith("/login");
  const isPublicRoute =
    pathname.startsWith("/trial") || pathname === "/website-chat.js";
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
