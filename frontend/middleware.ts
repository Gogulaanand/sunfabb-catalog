import { NextRequest, NextResponse } from "next/server";

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

  if (pathname.startsWith("/account")) {
    // Gate: redirect the entire /account/** subtree to home when e-commerce is not
    // yet open to users. Flip ECOMMERCE_ENABLED=true in Vercel env + redeploy to open.
    if (process.env.ECOMMERCE_ENABLED !== "true") {
      return NextResponse.redirect(new URL("/", request.url));
    }

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
  matcher: ["/admin/:path*", "/account/:path*"],
};
