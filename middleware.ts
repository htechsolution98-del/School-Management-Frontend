import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/principal",
  "/superadmin",
  "/trustee",
  "/clerk",
  "/teacher",
  "/librarian",
  "/inventory",
  "/fees",
  "/student",
  "/parent",
  "/admin",
  "/user",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected) {
    const accessToken = request.cookies.get("access_token")?.value;
    const refreshToken = request.cookies.get("refresh_token")?.value;

    // If no JWT token cookie exists, redirect to login page immediately
    if (!accessToken && !refreshToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/principal",
    "/principal/:path*",
    "/superadmin",
    "/superadmin/:path*",
    "/trustee",
    "/trustee/:path*",
    "/clerk",
    "/clerk/:path*",
    "/teacher",
    "/teacher/:path*",
    "/librarian",
    "/librarian/:path*",
    "/inventory",
    "/inventory/:path*",
    "/fees",
    "/fees/:path*",
    "/student",
    "/student/:path*",
    "/parent",
    "/parent/:path*",
    "/admin",
    "/admin/:path*",
    "/user",
    "/user/:path*",
  ],
};

