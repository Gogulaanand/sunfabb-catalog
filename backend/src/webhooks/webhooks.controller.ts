import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { RazorpayService } from '../payments/razorpay.service.js';
import { WebhooksService } from './webhooks.service.js';
import { extractRazorpayPaymentEvent } from './razorpay-event.js';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly razorpay: RazorpayService,
    private readonly webhooks: WebhooksService,
  ) {}

  // No auth guard by design — the request is authenticated by its HMAC signature,
  // not a session (§4 / §7.1). We verify X-Razorpay-Signature over the RAW body
  // before touching the DB; a missing/tampered signature is 400 and nothing
  // changes (the order stays PENDING_PAYMENT — §12 #4).
  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Headers('x-razorpay-event-id') eventIdHeader: string | undefined,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody;
    if (!rawBody || !signature) {
      throw new BadRequestException('Missing signature or body');
    }

    if (!this.razorpay.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid JSON body');
    }

    const eventType = readString(payload, 'event') ?? 'unknown';
    // Razorpay's X-Razorpay-Event-Id is the documented idempotency key. Fall back
    // to a deterministic composite so a delivery without the header still dedupes.
    const eventId = eventIdHeader ?? `${eventType}:${fallbackId(payload)}`;

    await this.webhooks.handleRazorpay({ eventId, eventType, payload });
    return { received: true };
  }
}

function readString(payload: unknown, key: string): string | undefined {
  if (typeof payload === 'object' && payload !== null) {
    const value = (payload as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : undefined;
  }
  return undefined;
}

// Best-effort stable id from the payment/order entity when no header is present.
function fallbackId(payload: unknown): string {
  const { razorpayPaymentId, razorpayOrderId } =
    extractRazorpayPaymentEvent(payload);
  return razorpayPaymentId ?? razorpayOrderId ?? 'unknown';
}
