import { BadRequestException } from '@nestjs/common';
import type { OrderStatus } from '../../generated/prisma/client.js';

// Order status state machine (plan §3.2). Transitions are enforced server-side
// in a single guard — the client never sets a status. 6.3 only ever creates an
// order at PENDING_PAYMENT; the rest of the graph is exercised by payments (6.4)
// and admin order management (6.8), which call transition() to move an order.
//
//   PENDING_PAYMENT ─pay ok─► PAID ─admin─► PROCESSING ─ship─► SHIPPED ─► DELIVERED
//          │                   │
//          ├─pay fail/timeout─► PAYMENT_FAILED
//          └─customer/admin──► CANCELLED        (PAID/PROCESSING/… ─admin refund─► REFUNDED / PARTIALLY_REFUNDED)
//
// Stock is decremented on order creation (reservation, 6.3) and released on
// PAYMENT_FAILED / CANCELLED (6.4).
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
  SHIPPED: ['DELIVERED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
  DELIVERED: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  PARTIALLY_REFUNDED: ['REFUNDED'],
  PAYMENT_FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

// Throws a 400 if `next` is not a legal successor of `current`. Used by the
// service's transition() guard so an illegal status jump can never be persisted.
export function assertTransition(
  current: OrderStatus,
  next: OrderStatus,
): void {
  if (!canTransition(current, next)) {
    throw new BadRequestException(
      `Invalid order status transition: ${current} → ${next}`,
    );
  }
}
