import { NextRequest, NextResponse } from "next/server";
import { placeOrder, CustomerApiError } from "@/lib/customer-api";

export async function POST(request: NextRequest) {
  try {
    const { addressId, quoteToken } = await request.json();
    const result = await placeOrder({ addressId, quoteToken });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CustomerApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return NextResponse.json({ message: "Failed to place order" }, { status: 500 });
  }
}
