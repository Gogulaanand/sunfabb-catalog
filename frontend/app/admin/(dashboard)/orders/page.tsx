import { listAdminOrders } from "@/lib/admin-api";
import { parseAdminOrdersQuery } from "@/lib/admin-order-query";
import { OrdersClient } from "./orders-client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const filters = parseAdminOrdersQuery(raw);
  const response = await listAdminOrders(filters);

  return <OrdersClient response={response} filters={filters} />;
}
