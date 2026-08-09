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

function asPositivePaise(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined;
}

export interface RazorpayPaymentEvent {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  method?: string;
  amountPaise?: number;
}

export interface RazorpayRefundEvent {
  refundId: string;
  razorpayPaymentId: string;
  amountPaise: number;
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

// refund.created and refund.processed are lifecycle notifications for the same
// refund entity. The entity id is therefore both audit data and the stable key
// used by WebhooksService to ensure the amount is accumulated exactly once.
export function extractRazorpayRefundEvent(
  payload: unknown,
): RazorpayRefundEvent | undefined {
  const inner = asRecord(asRecord(payload)?.payload);
  const refundEntity = asRecord(asRecord(inner?.refund)?.entity);

  if (asString(refundEntity?.entity) !== 'refund') {
    return undefined;
  }

  const refundId = asString(refundEntity?.id);
  const razorpayPaymentId = asString(refundEntity?.payment_id);
  const amountPaise = asPositivePaise(refundEntity?.amount);

  if (!refundId || !razorpayPaymentId || amountPaise === undefined) {
    return undefined;
  }

  return { refundId, razorpayPaymentId, amountPaise };
}
