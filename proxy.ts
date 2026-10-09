import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLE_ROUTE_PREFIX_MAP: Record<string, string[]> = {
  "/teacher": ["teacher", "staff"],
  "/principal": ["principal", "super_admin", "superadmin"],
  "/trustee": ["admin(trustee)", "trustee", "super_admin", "superadmin"],
  "/clerk": ["clerk", "fees_clerk"],
  "/librarian": ["librarian"],
  "/inventory": ["inventory"],
  "/fees": ["fees management", "fees", "fees_clerk", "clerk"],
  "/student": ["student"],
  "/parent": ["parents", "parent"],
  "/superadmin": ["super_admin", "superadmin"],
  "/user": ["temp_user", "user"],
};

const PROTECTED_PREFIXES = Object.keys(ROLE_ROUTE_PREFIX_MAP);

function resolveDashboardRoute(roles: string[]): string {
  const normalized = (roles || []).map((r) => String(r).toLowerCase().trim());
  if (normalized.includes("super_admin") || normalized.includes("superadmin")) return "/superadmin";
  if (normalized.includes("admin(trustee)") || normalized.includes("trustee")) return "/trustee";
  if (normalized.includes("principal")) return "/principal";
  if (normalized.includes("clerk") || normalized.includes("fees_clerk")) return "/clerk";
  if (normalized.includes("teacher") || normalized.includes("staff")) return "/teacher";
  if (normalized.includes("librarian")) return "/librarian";
  if (normalized.includes("inventory")) return "/inventory";
  if (normalized.includes("fees") || normalized.includes("fees management")) return "/fees";
  if (normalized.includes("student")) return "/student";
  if (normalized.includes("parent") || normalized.includes("parents")) return "/parent";
  return "/user";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const matchedPrefix = PROTECTED_PREFIXES.find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (matchedPrefix) {
    const accessToken = request.cookies.get("access_token")?.value;
    const refreshToken = request.cookies.get("refresh_token")?.value;

    // If no JWT token cookie exists, redirect to login page immediately
    if (!accessToken && !refreshToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based route guard enforcement from cookies
    const userRolesCookie = request.cookies.get("user_roles")?.value;
    const userRoleCookie = request.cookies.get("user_role")?.value;
    let roles: string[] = [];

    if (userRolesCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(userRolesCookie));
        if (Array.isArray(parsed)) {
          roles = parsed.map((r) => String(r).toLowerCase().trim()).filter(Boolean);
        }
      } catch {}
    }

    if (userRoleCookie && !roles.length) {
      const singleRole = decodeURIComponent(userRoleCookie).toLowerCase().trim();
      if (singleRole) {
        roles = [singleRole];
      }
    }

    if (roles.length > 0) {
      const allowedRoles = ROLE_ROUTE_PREFIX_MAP[matchedPrefix];
      if (allowedRoles) {
        const hasAccess = allowedRoles.some((allowed) => roles.includes(allowed));
        if (!hasAccess) {
          const targetDashboard = resolveDashboardRoute(roles);
          // Only redirect if destination is distinct from current prefix
          if (targetDashboard && !pathname.startsWith(targetDashboard)) {
            return NextResponse.redirect(new URL(targetDashboard, request.url));
          }
        }
      }
    }
  }

  return NextResponse.next();
}

// Export middleware as alias for Next.js proxy compatibility
export const middleware = proxy;

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
