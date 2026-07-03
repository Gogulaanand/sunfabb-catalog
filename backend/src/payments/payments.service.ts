import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { RazorpayService } from './razorpay.service.js';
import type { CurrentCustomerData } from '../customer-auth/strategies/customer-jwt.strategy.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';

const ORDER_INCLUDE = { items: true } as const;

// The params the hosted Checkout needs on the client. `key` is the publishable
// key id (safe in the browser); the amount/order id are the server-authoritative
// values Razorpay will enforce — the client never supplies an amount (D34 / §7.1).
export interface RazorpayCheckoutParams {
  key: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  orderNumber: string;
}

// A confirmation carries a payment id always; method + amount only from the
// webhook (the callback has neither). amountPaise, when present, is checked
// against the order total — the signed webhook is where a mismatch surfaces.
interface ConfirmPaidInput {
  razorpayPaymentId: string;
  method?: string;
  amountPaise?: number;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
    private readonly email: EmailService,
  ) {}

  // Called by POST /orders right after the DB order is committed (6.3). Creates
  // the matching Razorpay order for the server-computed total (never a client
  // amount) and persists a CREATED Payment. The external SDK call is made OUTSIDE
  // any DB transaction — holding a DB connection across a network round-trip would
  // risk the tx timeout (D39). If Razorpay can't create the order, the reserved
  // stock is released (the order can never be paid, and its cart is already
  // cleared) so a gateway outage doesn't strand inventory on a dead order.
  async createForOrder(order: {
    id: string;
    order_number: string;
    total_paise: number;
  }): Promise<RazorpayCheckoutParams> {
    let rzpOrder;
    try {
      rzpOrder = await this.razorpay.createOrder({
        amountPaise: order.total_paise,
        receipt: order.order_number,
        notes: { order_number: order.order_number },
      });
    } catch (err) {
      this.logger.error(
        `Razorpay order creation failed for ${order.order_number}: ${String(err)}`,
      );
      await this.releaseByOrderId(order.id);
      throw new BadRequestException(
        'Could not initiate payment. Please try again.',
      );
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.create({
          data: {
            order_id: order.id,
            razorpay_order_id: rzpOrder.id,
            amount_paise: order.total_paise,
            status: 'CREATED',
          },
        });
        await tx.order.update({
          where: { id: order.id },
          data: { razorpay_order_id: rzpOrder.id },
        });
      });
    } catch (err) {
      // The Razorpay order exists but we failed to record it — this order can
      // never be reached again (confirmPaid/markFailed both look it up by
      // razorpay_order_id, which never got persisted), so it can never be
      // paid. Release the stock reserved at order creation rather than
      // leaking it, same as the SDK-throws path above.
      this.logger.error(
        `Failed to persist Razorpay order for ${order.order_number}: ${String(err)}`,
      );
      await this.releaseByOrderId(order.id);
      throw err;
    }

    return {
      key: this.razorpay.getKeyId(),
      razorpayOrderId: rzpOrder.id,
      amountPaise: order.total_paise,
      currency: rzpOrder.currency,
      orderNumber: order.order_number,
    };
  }

  // POST /payments/verify — the optimistic client callback. Verify the callback
  // HMAC; a tampered signature is 400 and the order stays PENDING_PAYMENT
  // (§12 #4). The order must belong to the caller (IDOR — foreign/unknown → 404,
  // §7.2). The webhook remains the source of truth; this and the webhook both
  // converge to PAID exactly once via the idempotent confirmPaid().
  async verifyCallback(customer: CurrentCustomerData, dto: VerifyPaymentDto) {
    const valid = this.razorpay.verifyPaymentSignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );
    if (!valid) {
      throw new BadRequestException('Invalid payment signature');
    }

    const order = await this.prisma.order.findFirst({
      where: {
        razorpay_order_id: dto.razorpayOrderId,
        customer_id: customer.customerId,
      },
      select: { id: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.confirmPaid(dto.razorpayOrderId, {
      razorpayPaymentId: dto.razorpayPaymentId,
    });

    return this.prisma.order.findFirst({
      where: { id: order.id },
      include: ORDER_INCLUDE,
    });
  }

  // Idempotent "payment succeeded" handler, called by BOTH the client callback
  // and the webhook (and by both Razorpay events — payment.captured AND
  // order.paid — for a single payment). Split into two idempotent steps so
  // whichever path wins the race, all data still lands:
  //   1. Record payment details (id/method/CAPTURED) — safe to repeat.
  //   2. Flip PENDING_PAYMENT → PAID atomically via a conditional updateMany.
  //      Only the single winning update (count === 1) sends the confirmation
  //      email, so a replay/race never double-emails or double-confirms.
  // The conditional update is the race-safe equivalent of
  // transition(PENDING_PAYMENT → PAID); stock was already reserved at order time
  // (6.3), so PAID makes no stock change.
  async confirmPaid(
    razorpayOrderId: string,
    input: ConfirmPaidInput,
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { razorpay_order_id: razorpayOrderId },
      select: { id: true, total_paise: true, email: true, order_number: true },
    });
    if (!order) {
      this.logger.warn(
        `confirmPaid: no order for razorpay_order_id=${razorpayOrderId}`,
      );
      return;
    }

    // Server is the price authority (§7.1): the signed webhook echoes the amount
    // Razorpay charged; if it ever disagrees with our recomputed total, do NOT
    // confirm — log loudly for manual reconciliation instead.
    if (
      input.amountPaise !== undefined &&
      input.amountPaise !== order.total_paise
    ) {
      this.logger.error(
        `confirmPaid: amount mismatch for ${order.order_number} — ` +
          `charged ${input.amountPaise} vs order total ${order.total_paise}; not confirming`,
      );
      return;
    }

    // Step 1 — record payment details (idempotent; runs from whichever path has
    // the data, so method survives even if the detail-less callback wins step 2).
    await this.prisma.payment.updateMany({
      where: { razorpay_order_id: razorpayOrderId },
      data: {
        razorpay_payment_id: input.razorpayPaymentId,
        method: input.method,
        status: 'CAPTURED',
      },
    });

    // Step 2 — flip to PAID exactly once.
    const { count } = await this.prisma.order.updateMany({
      where: { id: order.id, status: 'PENDING_PAYMENT' },
      data: {
        status: 'PAID',
        placed_at: new Date(),
        razorpay_payment_id: input.razorpayPaymentId,
      },
    });

    if (count === 1) {
      // Email must never fail the money path (§12 #7) — swallow + log.
      await this.email
        .sendOrderConfirmation(order.email, order.order_number)
        .catch((err) =>
          this.logger.error(
            `Order-confirmation email failed for ${order.order_number}: ${String(err)}`,
          ),
        );
    }
  }

  // Handles the webhook's payment.failed event for ONE payment attempt.
  // Deliberately does NOT touch order status or stock: Razorpay's hosted
  // Checkout lets a customer retry a failed attempt against the SAME
  // razorpay_order_id, so a payment.failed here does not mean the order is
  // dead — a later payment.captured/order.paid for the same order must still
  // be able to confirm it. Treating a single failed attempt as order-terminal
  // (an earlier version of this method did) stranded a captured payment on a
  // PAYMENT_FAILED order with its stock already released back — a real bug
  // caught by security + code review before this shipped (D40). Idempotent:
  // replays of the same failed attempt just rewrite the same FAILED status.
  async markFailed(
    razorpayOrderId: string,
    razorpayPaymentId?: string,
  ): Promise<void> {
    const { count } = await this.prisma.payment.updateMany({
      where: {
        razorpay_order_id: razorpayOrderId,
        status: { not: 'CAPTURED' },
      },
      data: { status: 'FAILED', razorpay_payment_id: razorpayPaymentId },
    });
    if (count === 0) {
      this.logger.warn(
        `markFailed: no updatable Payment for razorpay_order_id=${razorpayOrderId} ` +
          '(no matching order, or it is already CAPTURED — a later attempt already succeeded)',
      );
    }
  }

  // Shared release primitive keyed by our own order id — used only when the
  // order genuinely can never be paid: the Razorpay order was never created
  // (createForOrder's SDK-failure or persist-failure paths). A single failed
  // PAYMENT ATTEMPT does not qualify (see markFailed above) — abandoned
  // PENDING_PAYMENT orders that never fail or succeed are reconciled by an
  // expiry sweep, deferred to 6.9 per the plan's C9 decision.
  private async releaseByOrderId(orderId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id: orderId, status: 'PENDING_PAYMENT' },
        data: { status: 'PAYMENT_FAILED' },
      });
      if (count !== 1) {
        return; // already terminal — don't release stock twice
      }
      const items = await tx.orderItem.findMany({
        where: { order_id: orderId },
        select: { variant_id: true, quantity: true },
      });
      for (const item of items) {
        await tx.productVariant.update({
          where: { id: item.variant_id },
          data: { stock_quantity: { increment: item.quantity } },
        });
      }
      await tx.payment.updateMany({
        where: { order_id: orderId },
        data: { status: 'FAILED' },
      });
    });
  }
}
