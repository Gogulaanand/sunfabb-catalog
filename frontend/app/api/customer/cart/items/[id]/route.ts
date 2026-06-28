import { NextRequest, NextResponse } from "next/server";
import { updateCartItem, removeCartItem, CustomerApiError } from "@/lib/customer-api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { quantity } = await request.json();
    const cart = await updateCartItem(id, quantity);
    return NextResponse.json(cart);
  } catch (error) {
    if (error instanceof CustomerApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return NextResponse.json({ message: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const result = await removeCartItem(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CustomerApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    return NextResponse.json({ message: "Failed to remove item" }, { status: 500 });
  }
}
