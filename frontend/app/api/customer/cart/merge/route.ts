import { NextRequest, NextResponse } from "next/server";
import { mergeCart, CustomerApiError } from "@/lib/customer-api";

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json();
    const cart = await mergeCart(items);
    return NextResponse.json(cart);
  } catch (error) {
    if (error instanceof CustomerApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return NextResponse.json({ message: "Failed to merge cart" }, { status: 500 });
  }
}
