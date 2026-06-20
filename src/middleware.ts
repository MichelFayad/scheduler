import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isLoginPage = pathname.startsWith("/admin/login");
  const isAdminPage = pathname.startsWith("/admin") && !isLoginPage;

  // Unauthenticated users trying to reach a protected admin page → login.
  if (isAdminPage && !isLoggedIn) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already-authenticated users hitting the login page → dashboard
  // (prevents the login form rendering inside the admin shell).
  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
