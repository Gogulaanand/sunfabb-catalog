import { z } from "zod";

export const adminOrderStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "PAYMENT_FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
]);

export type AdminOrderStatus = z.infer<typeof adminOrderStatusSchema>;
