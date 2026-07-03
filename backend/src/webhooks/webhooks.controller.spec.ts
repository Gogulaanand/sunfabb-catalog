import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';
import { RazorpayService } from '../payments/razorpay.service.js';

const mockRazorpay = {
  verifyWebhookSignature: jest.fn(),
};

const mockWebhooksService = {
  handleRazorpay: jest.fn(),
};

// Only req.rawBody is read by the controller — the rest of Express's Request
// is irrelevant to this test, so a minimal object stands in for it.
function fakeRequest(rawBody?: Buffer): RawBodyRequest<Request> {
  return { rawBody } as unknown as RawBodyRequest<Request>;
}

describe('WebhooksController — raw-body HMAC gate (§7.1, §12 #4)', () => {
  let controller: WebhooksController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: RazorpayService, useValue: mockRazorpay },
        { provide: WebhooksService, useValue: mockWebhooksService },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
  });

  it('accepts a valid signature and forwards to the service', async () => {
    mockRazorpay.verifyWebhookSignature.mockReturnValue(true);
    const body = Buffer.from(
      JSON.stringify({ event: 'payment.captured', payload: {} }),
    );

    const result = await controller.handle(
      fakeRequest(body),
      'valid-signature',
      'evt_header_1',
    );

    expect(result).toEqual({ received: true });
    expect(mockWebhooksService.handleRazorpay).toHaveBeenCalledWith({
      eventId: 'evt_header_1',
      eventType: 'payment.captured',
      payload: { event: 'payment.captured', payload: {} },
    });
  });

  it('rejects a tampered signature with 400 and never calls the service', async () => {
    mockRazorpay.verifyWebhookSignature.mockReturnValue(false);
    const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));

    await expect(
      controller.handle(fakeRequest(body), 'tampered-signature', 'evt_1'),
    ).rejects.toThrow(BadRequestException);
    expect(mockWebhooksService.handleRazorpay).not.toHaveBeenCalled();
  });

  it('rejects when the signature header is missing', async () => {
    const body = Buffer.from('{}');
    await expect(
      controller.handle(fakeRequest(body), undefined, 'evt_1'),
    ).rejects.toThrow(BadRequestException);
    expect(mockRazorpay.verifyWebhookSignature).not.toHaveBeenCalled();
  });

  it('rejects when the raw body is missing (rawBody not configured)', async () => {
    await expect(
      controller.handle(fakeRequest(undefined), 'sig', 'evt_1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('falls back to a deterministic event id when X-Razorpay-Event-Id is absent', async () => {
    mockRazorpay.verifyWebhookSignature.mockReturnValue(true);
    const body = Buffer.from(
      JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: { entity: { id: 'pay_99', order_id: 'order_99' } },
        },
      }),
    );

    await controller.handle(fakeRequest(body), 'valid-signature', undefined);

    expect(mockWebhooksService.handleRazorpay).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'payment.captured:pay_99' }),
    );
  });
});
