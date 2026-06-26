import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("customer_token");
  response.cookies.delete("customer_logged_in");
  return response;
}
