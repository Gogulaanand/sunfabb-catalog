import { createHmac, timingSafeEqual } from 'crypto';
import { Injectable } from '@nestjs/common';
import Razorpay from 'razorpay';
import {
  getRazorpayKeyId,
  getRazorpayKeySecret,
  getRazorpayWebhookSecret,
} from './razorpay-config.js';

export interface CreateRazorpayOrderParams {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

// Thin wrapper around the Razorpay SDK. Isolates the single outbound network
// call (orders.create) and the two HMAC verifications, so the rest of the
// payment code — and its unit tests — never touch the SDK or process.env
// directly. Signature verification is done with Node's crypto (not the SDK
// helper) so we control the length-guard and can prove it against Razorpay's
// documented test vector.
@Injectable()
export class RazorpayService {
  private client: Razorpay | null = null;

  // Construct the SDK client lazily so the app boots without keys; the first
  // real payment call surfaces a clear missing-config error (fail-fast, no
  // fallback) instead of the module throwing at startup.
  private getClient(): Razorpay {
    if (!this.client) {
      this.client = new Razorpay({
        key_id: getRazorpayKeyId(),
        key_secret: getRazorpayKeySecret(),
      });
    }
    return this.client;
  }

  // The publishable key id — safe to hand to the browser; the hosted Checkout
  // needs it. The key SECRET and webhook secret are backend-only and never leave.
  getKeyId(): string {
    return getRazorpayKeyId();
  }

  async createOrder(
    params: CreateRazorpayOrderParams,
  ): Promise<RazorpayOrderResult> {
    const order = await this.getClient().orders.create({
      amount: params.amountPaise, // paise — matches our integer-paise money (D6)
      currency: 'INR',
      receipt: params.receipt,
      notes: params.notes,
    });
    return {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      status: order.status,
    };
  }

  // Callback signature (client → /payments/verify):
  //   HMAC_SHA256("<razorpay_order_id>|<razorpay_payment_id>", KEY_SECRET) (§7.1).
  verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    signature: string,
  ): boolean {
    const expected = createHmac('sha256', getRazorpayKeySecret())
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    return timingSafeEqualHex(expected, signature);
  }

  // Webhook signature (Razorpay → /webhooks/razorpay):
  //   HMAC_SHA256(rawBody, WEBHOOK_SECRET) compared to the X-Razorpay-Signature
  //   header. The RAW request bytes are required — re-serialised JSON reorders/
  //   respaces bytes and breaks the HMAC (§7.1 raw-body gotcha).
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const expected = createHmac('sha256', getRazorpayWebhookSecret())
      .update(rawBody)
      .digest('hex');
    return timingSafeEqualHex(expected, signature);
  }
}

// Constant-time hex compare that never throws. crypto.timingSafeEqual requires
// equal-length buffers (it throws RangeError otherwise) — and a tampered or
// garbage signature is frequently the wrong length. That case must read as
// "invalid" (→ 400 at the caller), never crash the request (→ 500). So: reject
// on a length/type mismatch first, then constant-time compare equal-length bytes.
function timingSafeEqualHex(expected: string, actual: unknown): boolean {
  if (typeof actual !== 'string' || expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}
