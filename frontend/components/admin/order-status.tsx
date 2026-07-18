import { Tag } from "@chakra-ui/react";
import { adminOrderStatusSchema, type AdminOrderStatus } from "@/lib/admin-order-status";

const ORDER_STATUS_META: Record<AdminOrderStatus, { label: string; colorPalette: string }> = {
  PENDING_PAYMENT: { label: "Pending payment", colorPalette: "yellow" },
  PAID: { label: "Paid", colorPalette: "green" },
  PROCESSING: { label: "Processing", colorPalette: "blue" },
  SHIPPED: { label: "Shipped", colorPalette: "purple" },
  DELIVERED: { label: "Delivered", colorPalette: "teal" },
  CANCELLED: { label: "Cancelled", colorPalette: "red" },
  PAYMENT_FAILED: { label: "Payment failed", colorPalette: "red" },
  REFUNDED: { label: "Refunded", colorPalette: "orange" },
  PARTIALLY_REFUNDED: { label: "Partially refunded", colorPalette: "orange" },
};

export const ORDER_STATUS_OPTIONS = adminOrderStatusSchema.options.map((value) => ({
  value,
  label: ORDER_STATUS_META[value].label,
}));

export function orderStatusLabel(status: AdminOrderStatus): string {
  return ORDER_STATUS_META[status].label;
}

export function OrderStatusBadge({ status }: { status: AdminOrderStatus }) {
  const meta = ORDER_STATUS_META[status];
  return (
    <Tag.Root colorPalette={meta.colorPalette} size="sm">
      <Tag.Label>{meta.label}</Tag.Label>
    </Tag.Root>
  );
}
