import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { extractRazorpayPaymentEvent } from './razorpay-event.js';

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

    await this.process(event.eventType, event.payload);

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

      default:
        this.logger.log(`Ignoring unhandled Razorpay event: ${eventType}`);
    }
  }
}
