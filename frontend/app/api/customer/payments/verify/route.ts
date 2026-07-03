import { NextRequest, NextResponse } from "next/server";
import { verifyPayment, CustomerApiError } from "@/lib/customer-api";

export async function POST(request: NextRequest) {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = await request.json();
    const order = await verifyPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature });
    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof CustomerApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return NextResponse.json({ message: "Failed to verify payment" }, { status: 500 });
  }
}
