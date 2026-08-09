import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { assertTransition } from '../orders/order-status.js';
import {
  extractRazorpayPaymentEvent,
  extractRazorpayRefundEvent,
} from './razorpay-event.js';

export interface RazorpayWebhook {
  eventId: string;
  eventType: string;
  payload: unknown;
}

// Structural P2002 check without importing the generated Prisma error class at
// runtime (mirrors OrdersService.isUniqueViolation).
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === 'P2002'
  );
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  // Source of truth for payment outcome (§7.1). Idempotent: every inbound event
  // is recorded in the WebhookEvent ledger keyed by @@unique([provider, event_id]),
  // and processing is only skipped once an event is fully processed (processed_at
  // set). Recording BEFORE processing but skipping only on processed_at means a
  // crash mid-processing is safely retried by Razorpay rather than permanently
  // swallowed — and the underlying confirmPaid/markFailed are themselves
  // idempotent, so reprocessing an unfinished event still yields a single effect.
  async handleRazorpay(event: RazorpayWebhook): Promise<void> {
    const existing = await this.prisma.webhookEvent.findFirst({
      where: { provider: 'RAZORPAY', event_id: event.eventId },
      select: { processed_at: true },
    });
    if (existing?.processed_at) {
      // Already fully processed — a genuine Razorpay retry. No-op (§12 #4).
      return;
    }

    if (!existing) {
      try {
        await this.prisma.webhookEvent.create({
          data: {
            provider: 'RAZORPAY',
            event_id: event.eventId,
            event_type: event.eventType,
            // Verified via HMAC over the raw body; stored for audit. Prisma's Json
            // column requires the InputJsonValue type at this write boundary.
            payload: event.payload as Prisma.InputJsonValue,
          },
        });
      } catch (err) {
        if (!isUniqueViolation(err)) {
          throw err;
        }
        // A concurrent delivery inserted the row first. If it also finished
        // processing, stop; otherwise fall through — the idempotent handlers
        // below make a double-process harmless.
        const now = await this.prisma.webhookEvent.findFirst({
          where: { provider: 'RAZORPAY', event_id: event.eventId },
          select: { processed_at: true },
        });
        if (now?.processed_at) {
          return;
        }
      }
    }

    if (
      event.eventType === 'refund.created' ||
      event.eventType === 'refund.processed'
    ) {
      await this.processRefund(event.eventType, event.payload);
    } else {
      await this.process(event.eventType, event.payload);
    }

    await this.prisma.webhookEvent.updateMany({
      where: { provider: 'RAZORPAY', event_id: event.eventId },
      data: { processed_at: new Date() },
    });
  }

  private async process(eventType: string, payload: unknown): Promise<void> {
    const { razorpayOrderId, razorpayPaymentId, method, amountPaise } =
      extractRazorpayPaymentEvent(payload);

    if (!razorpayOrderId) {
      this.logger.warn(
        `Razorpay ${eventType} webhook without an order id — ignoring`,
      );
      return;
    }

    switch (eventType) {
      // Both events fire for one successful payment; distinct event_ids record
      // both, and confirmPaid's conditional flip makes the second a no-op.
      case 'payment.captured':
      case 'order.paid':
        if (!razorpayPaymentId) {
          this.logger.warn(
            `Razorpay ${eventType} without a payment id for ${razorpayOrderId}`,
          );
          return;
        }
        // The webhook is the price-authority source of truth (§7.1) — unlike
        // the optimistic client callback, it must never confirm without a
        // verified amount. A signed event that's somehow missing `amount` is
        // a verification failure, not a silent pass-through.
        if (amountPaise === undefined) {
          this.logger.error(
            `Razorpay ${eventType} for ${razorpayOrderId} carried no amount — not confirming`,
          );
          return;
        }
        await this.payments.confirmPaid(razorpayOrderId, {
          razorpayPaymentId,
          method,
          amountPaise,
        });
        break;

      case 'payment.failed':
        await this.payments.markFailed(razorpayOrderId, razorpayPaymentId);
        break;

      // Razorpay fires order.expired 15 minutes after order creation when no
      // payment has been captured. Belt-and-suspenders alongside the hourly
      // cron (C9/D41): whichever arrives first releases the reserved stock.
      case 'order.expired': {
        const order = await this.prisma.order.findUnique({
          where: { razorpay_order_id: razorpayOrderId },
          select: { id: true },
        });
        if (!order) {
          this.logger.warn(
            `order.expired: no backend order for razorpay_order_id=${razorpayOrderId}`,
          );
          return;
        }
        await this.payments.releaseByOrderId(order.id);
        break;
      }

      default:
        this.logger.log(`Ignoring unhandled Razorpay event: ${eventType}`);
    }
  }

  private async processRefund(
    eventType: 'refund.created' | 'refund.processed',
    payload: unknown,
  ): Promise<void> {
    const refund = extractRazorpayRefundEvent(payload);
    if (!refund) {
      this.logger.error(
        `Razorpay ${eventType} carried an invalid refund entity — not synchronizing`,
      );
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // Razorpay sends refund.created and refund.processed for the same refund
      // entity, with separate X-Razorpay-Event-Id values and no ordering
      // guarantee. Keep both raw deliveries in the ledger, then atomically claim
      // the refund entity itself through a synthetic ledger row. createMany with
      // skipDuplicates is race-safe on the existing provider/event_id unique key:
      // exactly one concurrent delivery receives count=1 and may mutate money.
      const { count } = await tx.webhookEvent.createMany({
        data: [
          {
            provider: 'RAZORPAY',
            event_id: `refund:${refund.refundId}`,
            event_type: 'refund.sync',
            payload: payload as Prisma.InputJsonValue,
            processed_at: new Date(),
          },
        ],
        skipDuplicates: true,
      });
      if (count === 0) {
        return;
      }

      const payment = await tx.payment.findUnique({
        where: { razorpay_payment_id: refund.razorpayPaymentId },
        select: {
          id: true,
          amount_paise: true,
          refunded_paise: true,
          order: {
            select: { id: true, order_number: true, status: true },
          },
        },
      });
      if (!payment) {
        this.logger.warn(
          `${eventType}: no Payment for razorpay_payment_id=${refund.razorpayPaymentId}; ` +
            `refund_id=${refund.refundId} acknowledged without mutation`,
        );
        return;
      }

      const expectedRefundedPaise = payment.refunded_paise + refund.amountPaise;
      if (expectedRefundedPaise > payment.amount_paise) {
        this.logger.error(
          `${eventType}: refund ${refund.refundId} would exceed captured amount for ` +
            `${payment.order.order_number} — ${expectedRefundedPaise} vs ${payment.amount_paise}; ` +
            'acknowledged without mutation',
        );
        return;
      }

      const expectedOrderStatus =
        expectedRefundedPaise >= payment.amount_paise
          ? ('REFUNDED' as const)
          : ('PARTIALLY_REFUNDED' as const);

      // A further partial refund may leave an already-PARTIALLY_REFUNDED order
      // in the same state. Every actual transition still passes through the
      // shared state-machine authority before either row is changed.
      if (payment.order.status !== expectedOrderStatus) {
        try {
          assertTransition(payment.order.status, expectedOrderStatus);
        } catch (err) {
          this.logger.error(
            `${eventType}: refund ${refund.refundId} cannot transition order ` +
              `${payment.order.order_number} from ${payment.order.status} to ${expectedOrderStatus}: ` +
              `${String(err)}; acknowledged without mutation`,
          );
          return;
        }
      }

      // Distinct refunds for one payment can arrive concurrently. Increment in
      // the database instead of writing the stale value read above; the upper
      // bound is re-evaluated after any competing transaction commits, so no
      // refund is lost and the total can never exceed the captured amount.
      const increment = await tx.payment.updateMany({
        where: {
          id: payment.id,
          refunded_paise: {
            lte: payment.amount_paise - refund.amountPaise,
          },
        },
        data: { refunded_paise: { increment: refund.amountPaise } },
      });
      if (increment.count !== 1) {
        this.logger.error(
          `${eventType}: concurrent refund ${refund.refundId} would exceed captured amount for ` +
            `${payment.order.order_number}; acknowledged without mutation`,
        );
        return;
      }

      const updatedPayment = await tx.payment.findUnique({
        where: { id: payment.id },
        select: {
          amount_paise: true,
          refunded_paise: true,
          order: {
            select: { id: true, order_number: true, status: true },
          },
        },
      });
      if (!updatedPayment) {
        // This is an internal consistency failure, not a vendor payload problem.
        // Throwing rolls back both the increment and refund claim so Razorpay can
        // retry instead of losing a valid refund during a database fault.
        throw new Error(
          `Payment ${payment.id} disappeared during refund synchronization`,
        );
      }

      const paymentStatus =
        updatedPayment.refunded_paise >= updatedPayment.amount_paise
          ? ('REFUNDED' as const)
          : ('PARTIALLY_REFUNDED' as const);
      const orderStatus = paymentStatus;

      if (updatedPayment.order.status !== orderStatus) {
        assertTransition(updatedPayment.order.status, orderStatus);
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: paymentStatus },
      });

      if (updatedPayment.order.status !== orderStatus) {
        await tx.order.update({
          where: { id: updatedPayment.order.id },
          data: { status: orderStatus },
        });
      }
      // Refund synchronization deliberately does not touch ProductVariant or
      // inventory. Physical returns are inspected and restocked by the owner.
    });
  }
}
