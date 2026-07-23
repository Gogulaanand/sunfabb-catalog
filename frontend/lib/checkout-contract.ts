import { z } from 'zod';

export const orderStatusSchema = z.enum([
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'PAYMENT_FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
]);

const shippingAddressSnapshotSchema = z.object({
  full_name: z.string(),
  phone: z.string(),
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  country: z.string(),
});

export const orderItemSchema = z.object({
  id: z.string(),
  variant_id: z.string(),
  product_name: z.string(),
  variant_label: z.string(),
  sku: z.string(),
  hsn_code: z.string().nullable(),
  unit_price_paise: z.number().int(),
  quantity: z.number().int(),
  line_total_paise: z.number().int(),
});

export const orderSchema = z.object({
  id: z.string(),
  order_number: z.string(),
  status: orderStatusSchema,
  email: z.string(),
  subtotal_paise: z.number().int(),
  shipping_paise: z.number().int(),
  tax_paise: z.number().int(),
  discount_paise: z.number().int(),
  total_paise: z.number().int(),
  currency: z.string(),
  shipping_address: shippingAddressSnapshotSchema,
  created_at: z.string(),
  items: z.array(orderItemSchema),
});

// Keeping this response contract in a non-server-only module lets both the
// Next route handler and the browser client validate the same boundary payload.
export const placeOrderResultSchema = z.object({
  order: orderSchema,
  payment: z.object({
    key: z.string().min(1),
    razorpayOrderId: z.string().min(1),
    amountPaise: z.number().int().nonnegative(),
    currency: z.literal('INR'),
    orderNumber: z.string().min(1),
  }),
});

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type Order = z.infer<typeof orderSchema>;
export type PlaceOrderResult = z.infer<typeof placeOrderResultSchema>;
