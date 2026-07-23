import { AdminApiError, getAdminOrder } from "@/lib/admin-api";
import { notFound } from "next/navigation";
import { OrderDetailClient } from "./order-detail-client";

type Params = Promise<{ id: string }>;

export default async function AdminOrderDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  let order;
  try {
    order = await getAdminOrder(id);
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 404) notFound();
    throw error;
  }
  return <OrderDetailClient initialOrder={order} />;
}
