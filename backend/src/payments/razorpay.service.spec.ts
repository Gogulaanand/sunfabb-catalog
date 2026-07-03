import { createHmac } from 'crypto';
import { RazorpayService } from './razorpay.service.js';

const KEY_SECRET = 'test-key-secret';
const WEBHOOK_SECRET = 'test-webhook-secret';

describe('RazorpayService — signature verification', () => {
  let service: RazorpayService;

  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
    process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
    service = new RazorpayService();
  });

  afterEach(() => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
  });

  describe('verifyPaymentSignature (callback, §7.1)', () => {
    it('accepts a correctly computed HMAC_SHA256(order_id|payment_id, key_secret)', () => {
      const orderId = 'order_ABC123';
      const paymentId = 'pay_XYZ789';
      const signature = createHmac('sha256', KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      expect(
        service.verifyPaymentSignature(orderId, paymentId, signature),
      ).toBe(true);
    });

    it('rejects a tampered (wrong-value) signature', () => {
      const orderId = 'order_ABC123';
      const paymentId = 'pay_XYZ789';
      const validSig = createHmac('sha256', KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      const tampered =
        validSig.slice(0, -1) + (validSig.at(-1) === 'a' ? 'b' : 'a');

      expect(service.verifyPaymentSignature(orderId, paymentId, tampered)).toBe(
        false,
      );
    });

    it('rejects a wrong-length signature without throwing (timingSafeEqual guard)', () => {
      expect(() =>
        service.verifyPaymentSignature('order_1', 'pay_1', 'short'),
      ).not.toThrow();
      expect(service.verifyPaymentSignature('order_1', 'pay_1', 'short')).toBe(
        false,
      );
    });

    it('rejects a signature computed with the wrong order/payment id pairing', () => {
      const signature = createHmac('sha256', KEY_SECRET)
        .update('order_A|pay_A')
        .digest('hex');
      expect(
        service.verifyPaymentSignature('order_B', 'pay_B', signature),
      ).toBe(false);
    });
  });

  describe('verifyWebhookSignature (§7.1)', () => {
    // Razorpay's own documented test vector (razorpay-node README):
    // body {"a":1,"b":2,"c":{"d":3}}, secret "123456" →
    // 2fe04e22977002e6c7cb553adab8b460cb9e2a4970d5953cb27a8472752e3bbc
    it('matches Razorpay documented test vector', () => {
      process.env.RAZORPAY_WEBHOOK_SECRET = '123456';
      const body = Buffer.from('{"a":1,"b":2,"c":{"d":3}}');
      const signature =
        '2fe04e22977002e6c7cb553adab8b460cb9e2a4970d5953cb27a8472752e3bbc';

      expect(service.verifyWebhookSignature(body, signature)).toBe(true);
    });

    it('accepts a correctly computed HMAC_SHA256(raw_body, webhook_secret)', () => {
      const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
      const signature = createHmac('sha256', WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      expect(service.verifyWebhookSignature(body, signature)).toBe(true);
    });

    it('rejects a tampered raw body against a signature computed for different bytes', () => {
      const original = Buffer.from(
        JSON.stringify({ event: 'payment.captured' }),
      );
      const signature = createHmac('sha256', WEBHOOK_SECRET)
        .update(original)
        .digest('hex');
      const tamperedBody = Buffer.from(
        JSON.stringify({ event: 'payment.captured', amount: 999999 }),
      );

      expect(service.verifyWebhookSignature(tamperedBody, signature)).toBe(
        false,
      );
    });

    it('rejects a wrong-length signature without throwing', () => {
      const body = Buffer.from('{}');
      expect(() =>
        service.verifyWebhookSignature(body, 'not-a-real-signature'),
      ).not.toThrow();
      expect(service.verifyWebhookSignature(body, 'not-a-real-signature')).toBe(
        false,
      );
    });

    it('rejects an empty-string signature', () => {
      const body = Buffer.from('{}');
      expect(service.verifyWebhookSignature(body, '')).toBe(false);
    });
  });

  describe('getKeyId', () => {
    it('returns the configured key id', () => {
      expect(service.getKeyId()).toBe('rzp_test_key');
    });

    it('throws when RAZORPAY_KEY_ID is unset (fail-fast, D31/rule 12)', () => {
      delete process.env.RAZORPAY_KEY_ID;
      expect(() => service.getKeyId()).toThrow(/RAZORPAY_KEY_ID/);
    });
  });
});
