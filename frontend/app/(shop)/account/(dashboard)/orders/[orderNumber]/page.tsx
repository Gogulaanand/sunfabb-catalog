import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrder, CustomerApiError, type Order } from "@/lib/customer-api";
import { formatPrice } from "@/lib/api";
import { OrderStatusBadge } from "@/components/account/order-status-badge";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ orderNumber: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { orderNumber } = await params;
  return { title: `Order ${orderNumber} — Sunfabb` };
}

export default async function OrderDetailPage({ params }: Props) {
  const { orderNumber } = await params;

  let order: Order;
  try {
    order = await getOrder(orderNumber);
  } catch (error) {
    if (error instanceof CustomerApiError) {
      if (error.status === 401) {
        redirect(`/account/login?next=/account/orders/${orderNumber}`);
      }
      // Another customer's order (or a nonexistent one) → 404, never confirm it exists.
      if (error.status === 404) {
        notFound();
      }
    }
    throw error;
  }

  const addr = order.shipping_address;

  return (
    <div className="max-w-3xl">
      <Link
        href="/account/orders"
        className="text-body-sm text-primary hover:underline"
      >
        ← All orders
      </Link>

      <div className="flex items-start justify-between gap-4 mt-4 mb-8">
        <div>
          <h2 className="font-display text-headline-md-mobile text-on-surface">
            {order.order_number}
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Placed{" "}
            {new Date(order.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-10">
        {/* Items */}
        <section className="lg:col-span-2">
          <h3 className="text-title-sm text-on-surface mb-4">Items</h3>
          <ul className="divide-y divide-outline-variant border-t border-outline-variant">
            {order.items.map((item) => (
              <li key={item.id} className="py-4 flex justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-title-sm text-on-surface">{item.product_name}</p>
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    {item.variant_label}
                  </p>
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    {formatPrice(item.unit_price_paise)} × {item.quantity}
                  </p>
                </div>
                <p className="text-body-md text-on-surface font-medium whitespace-nowrap">
                  {formatPrice(item.line_total_paise)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Summary + address */}
        <div className="mt-8 lg:mt-0 flex flex-col gap-6">
          <div className="bg-surface-container-low rounded-lg p-6 space-y-3">
            <h3 className="text-title-sm text-on-surface font-medium">Summary</h3>
            <div className="flex justify-between text-body-md text-on-surface-variant">
              <span>Subtotal</span>
              <span className="text-on-surface">{formatPrice(order.subtotal_paise)}</span>
            </div>
            <div className="flex justify-between text-body-md text-on-surface-variant">
              <span>Shipping</span>
              <span className="text-on-surface">
                {order.shipping_paise === 0 ? "Free" : formatPrice(order.shipping_paise)}
              </span>
            </div>
            <div className="flex justify-between text-body-md text-on-surface-variant">
              <span>Taxes</span>
              <span className="text-on-surface">
                {order.tax_paise === 0 ? "—" : formatPrice(order.tax_paise)}
              </span>
            </div>
            <div className="flex justify-between text-title-sm text-on-surface font-medium pt-3 border-t border-outline-variant">
              <span>Total</span>
              <span>{formatPrice(order.total_paise)}</span>
            </div>
          </div>

          <div className="border border-outline-variant rounded-lg p-6">
            <h3 className="text-title-sm text-on-surface font-medium mb-3">
              Shipping address
            </h3>
            <address className="not-italic text-body-sm text-on-surface-variant leading-relaxed">
              <span className="text-on-surface">{addr.full_name}</span>
              <br />
              {addr.line1}
              {addr.line2 ? (
                <>
                  <br />
                  {addr.line2}
                </>
              ) : null}
              <br />
              {addr.city}, {addr.state} {addr.pincode}
              <br />
              {addr.country}
              <br />
              {addr.phone}
            </address>
          </div>
        </div>
      </div>
    </div>
  );
}
