import type { OrderStatus } from "@/lib/customer-api";

const STATUS_STYLES: Record<OrderStatus, { label: string; className: string }> = {
  PENDING_PAYMENT: { label: "Pending payment", className: "text-on-surface-variant border-outline-variant" },
  PAID: { label: "Paid", className: "text-primary border-primary" },
  PROCESSING: { label: "Processing", className: "text-primary border-primary" },
  SHIPPED: { label: "Shipped", className: "text-primary border-primary" },
  DELIVERED: { label: "Delivered", className: "text-primary border-primary" },
  CANCELLED: { label: "Cancelled", className: "text-error border-error" },
  PAYMENT_FAILED: { label: "Payment failed", className: "text-error border-error" },
  REFUNDED: { label: "Refunded", className: "text-on-surface-variant border-outline-variant" },
  PARTIALLY_REFUNDED: { label: "Partially refunded", className: "text-on-surface-variant border-outline-variant" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, className } = STATUS_STYLES[status];
  return (
    <span
      className={`inline-block text-label-caps px-2.5 py-1 rounded-sm border ${className}`}
    >
      {label}
    </span>
  );
}
