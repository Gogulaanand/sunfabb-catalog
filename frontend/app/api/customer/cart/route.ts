import { NextResponse } from "next/server";
import { getCart, CustomerApiError } from "@/lib/customer-api";

export async function GET() {
  try {
    const cart = await getCart();
    return NextResponse.json(cart);
  } catch (error) {
    if (error instanceof CustomerApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return NextResponse.json({ message: "Failed to get cart" }, { status: 500 });
  }
}
