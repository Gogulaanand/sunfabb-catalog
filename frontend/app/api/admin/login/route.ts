import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminLoginProxyHeaders } from "@/lib/admin-login-proxy";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const loginResponseSchema = z.object({ access_token: z.string().min(1) });

export async function POST(request: NextRequest) {
  const body = await request.json();
  const proxyHeaders = getAdminLoginProxyHeaders(request.headers);

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...proxyHeaders },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Login failed" }));
    return NextResponse.json(error, { status: res.status });
  }

  const parsed = loginResponseSchema.safeParse(await res.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Unexpected response from backend" },
      { status: 502 },
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_token", parsed.data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return response;
}
