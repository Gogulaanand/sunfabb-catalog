import { NextRequest, NextResponse } from "next/server";
import { CustomerApiError, register } from "@/lib/customer-api";

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const { access_token, customer } = await register(body);
    const response = NextResponse.json({ customer });
    response.cookies.set("customer_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch (error) {
    if (error instanceof CustomerApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return NextResponse.json({ message: "Registration failed" }, { status: 500 });
  }
}
