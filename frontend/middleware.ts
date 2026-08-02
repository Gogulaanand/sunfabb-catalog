import { NextRequest, NextResponse } from "next/server";
import { isTransactionalCommerceEnabled } from "@/lib/storefront-mode";

const PUBLIC_ACCOUNT_PATHS = [
  "/account/login",
  "/account/register",
  "/account/forgot-password",
  "/account/reset-password",
  "/account/verify-email",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    const token = request.cookies.get("admin_token")?.value;
    if (!token) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (
    pathname.startsWith("/account") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/checkout")
  ) {
    // Lead-generation mode keeps the commerce route tree inaccessible even when
    // a visitor knows a direct URL. The backend separately rejects mutations.
    if (!isTransactionalCommerceEnabled()) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (!pathname.startsWith("/account")) return NextResponse.next();

    if (PUBLIC_ACCOUNT_PATHS.includes(pathname)) {
      return NextResponse.next();
    }

    const token = request.cookies.get("customer_token")?.value;
    if (!token) {
      const loginUrl = new URL("/account/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/account/:path*",
    "/cart/:path*",
    "/checkout/:path*",
  ],
};
