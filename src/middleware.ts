import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // For now, allow all requests through
  // Auth protection will be added when NextAuth is fully configured
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
  ],
};
