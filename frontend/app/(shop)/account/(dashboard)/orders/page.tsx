import Link from "next/link";
import { redirect } from "next/navigation";
import { listOrders, CustomerApiError } from "@/lib/customer-api";
import { formatPrice } from "@/lib/api";
import { OrderStatusBadge } from "@/components/account/order-status-badge";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your Orders — Sunfabb" };

export default async function OrdersPage() {
  let data;
  try {
    data = await listOrders();
  } catch (error) {
    if (error instanceof CustomerApiError && error.status === 401) {
      redirect("/account/login?next=/account/orders");
    }
    throw error;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-title-md text-on-surface font-medium">Your Orders</h2>
        <Link href="/account" className="text-body-sm text-primary hover:underline">
          ← Account
        </Link>
      </div>

      {data.orders.length === 0 ? (
        <div className="border border-outline-variant rounded-sm p-4 text-body-sm text-on-surface-variant">
          You haven&apos;t placed any orders yet.{" "}
          <Link href="/catalog" className="text-primary hover:underline">
            Browse the catalog
          </Link>
          .
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.orders.map((order) => {
            const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
            return (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.order_number}`}
                  className="block border border-outline-variant rounded-sm p-4 hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-title-sm text-on-surface">{order.order_number}</p>
                      <p className="text-body-sm text-on-surface-variant mt-1">
                        {new Date(order.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {" · "}
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <OrderStatusBadge status={order.status} />
                      <p className="text-body-md text-on-surface font-medium mt-2">
                        {formatPrice(order.total_paise)}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
