import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const adminRoles = ["super_admin", "owner", "admin"];
const kitchenRoles = ["super_admin", "owner", "admin", "chef"];

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  // Not authenticated → redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string | undefined;

  // Admin routes: /dashboard, /menu, /orders, /staff, /settings, etc.
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/menu") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/tables") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/integrations") ||
    pathname.startsWith("/stats")
  ) {
    if (!role || !adminRoles.includes(role)) {
      return NextResponse.redirect(new URL("/cuenta", request.url));
    }
  }

  // Kitchen routes
  if (pathname.startsWith("/kitchen")) {
    if (!role || !kitchenRoles.includes(role)) {
      return NextResponse.redirect(new URL("/cuenta", request.url));
    }
  }

  // POS routes
  if (pathname.startsWith("/pos")) {
    if (!role) {
      return NextResponse.redirect(new URL("/cuenta", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/menu/:path*",
    "/orders/:path*",
    "/settings/:path*",
    "/kitchen/:path*",
    "/pos/:path*",
    "/staff/:path*",
    "/tables/:path*",
    "/inventory/:path*",
    "/reports/:path*",
    "/billing/:path*",
    "/integrations/:path*",
    "/stats/:path*",
    "/cuenta/:path*",
  ],
};
