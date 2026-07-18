"use server";

import { revalidatePath } from "next/cache";
import {
  AdminApiError,
  updateAdminOrderStatus,
  type AdminOrderDetail,
  type AdminOrderStatus,
} from "@/lib/admin-api";

export async function updateAdminOrderStatusAction(
  id: string,
  status: AdminOrderStatus,
): Promise<{ ok: true; data: AdminOrderDetail } | { ok: false; error: string }> {
  try {
    const data = await updateAdminOrderStatus(id, status);
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${id}`);
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof AdminApiError ? error.message : "Could not update order status",
    };
  }
}
