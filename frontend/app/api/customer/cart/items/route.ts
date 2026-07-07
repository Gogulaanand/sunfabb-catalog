import { NextRequest, NextResponse } from "next/server";
import { addCartItem, CustomerApiError } from "@/lib/customer-api";

export async function POST(request: NextRequest) {
  try {
    const { variantId, quantity } = await request.json();
    const cart = await addCartItem(variantId, quantity);
    return NextResponse.json(cart);
  } catch (error) {
    if (error instanceof CustomerApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return NextResponse.json({ message: "Failed to add item" }, { status: 500 });
  }
}
