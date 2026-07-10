// Safe extraction of the fields we need from a Razorpay webhook payload. The
// signature has already been verified (HMAC over the raw body), but the JSON is
// still external data — narrow it with runtime type guards rather than casting
// (CLAUDE.md rule 11 / D30). Shape (per Razorpay docs), e.g. payment.captured:
//   { event, payload: { payment: { entity: { id, order_id, method, amount } },
//                       order?:  { entity: { id } } } }
// order.paid carries both `payment` and `order`; payment.failed carries `payment`.

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

export interface RazorpayPaymentEvent {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  method?: string;
  amountPaise?: number;
}

export function extractRazorpayPaymentEvent(
  payload: unknown,
): RazorpayPaymentEvent {
  const inner = asRecord(asRecord(payload)?.payload);
  const paymentEntity = asRecord(asRecord(inner?.payment)?.entity);
  const orderEntity = asRecord(asRecord(inner?.order)?.entity);

  return {
    // order_id lives on the payment entity for payment.* events; order.paid also
    // exposes it as the order entity's own id — take whichever is present.
    razorpayOrderId:
      asString(paymentEntity?.order_id) ?? asString(orderEntity?.id),
    razorpayPaymentId: asString(paymentEntity?.id),
    method: asString(paymentEntity?.method),
    amountPaise: asNumber(paymentEntity?.amount),
  };
}
