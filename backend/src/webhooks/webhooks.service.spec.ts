import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaymentsService } from '../payments/payments.service.js';

const PAYMENT_CAPTURED_PAYLOAD = {
  event: 'payment.captured',
  payload: {
    payment: {
      entity: {
        id: 'pay_1',
        order_id: 'order_rzp_1',
        method: 'upi',
        amount: 250000,
      },
    },
  },
};

const ORDER_PAID_PAYLOAD = {
  event: 'order.paid',
  payload: {
    order: { entity: { id: 'order_rzp_1' } },
    payment: { entity: { id: 'pay_1', method: 'upi', amount: 250000 } },
  },
};

const PAYMENT_FAILED_PAYLOAD = {
  event: 'payment.failed',
  payload: {
    payment: { entity: { id: 'pay_2', order_id: 'order_rzp_2' } },
  },
};

function p2002() {
  return Object.assign(new Error('Unique constraint failed'), {
    code: 'P2002',
  });
}

// Typed so `.mock.calls` isn't `any` — processed_at is a real timestamp (new
// Date()), so tests inspect the call args directly rather than nesting
// expect.any(Date) inside a plain-object property.
interface WebhookEventUpdateManyArgs {
  where: { provider: string; event_id: string };
  data: { processed_at: Date };
}

const mockPrisma = {
  webhookEvent: {
    findFirst: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn<
      Promise<{ count: number }>,
      [WebhookEventUpdateManyArgs]
    >(),
  },
};

const mockPayments = {
  confirmPaid: jest.fn(),
  markFailed: jest.fn(),
};

describe('WebhooksService — idempotency + routing (§12 #4)', () => {
  let service: WebhooksService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.webhookEvent.findFirst.mockResolvedValue(null);
    mockPrisma.webhookEvent.create.mockResolvedValue({});
    mockPrisma.webhookEvent.updateMany.mockResolvedValue({ count: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentsService, useValue: mockPayments },
      ],
    }).compile();
    service = module.get<WebhooksService>(WebhooksService);
  });

  it('routes payment.captured to confirmPaid with the extracted fields', async () => {
    await service.handleRazorpay({
      eventId: 'evt_1',
      eventType: 'payment.captured',
      payload: PAYMENT_CAPTURED_PAYLOAD,
    });

    expect(mockPayments.confirmPaid).toHaveBeenCalledWith('order_rzp_1', {
      razorpayPaymentId: 'pay_1',
      method: 'upi',
      amountPaise: 250000,
    });
    const [flipArgs] = mockPrisma.webhookEvent.updateMany.mock.calls[0];
    expect(flipArgs.where).toEqual({ provider: 'RAZORPAY', event_id: 'evt_1' });
    expect(flipArgs.data.processed_at).toBeInstanceOf(Date);
  });

  it('routes order.paid to confirmPaid too (both events fire per payment)', async () => {
    await service.handleRazorpay({
      eventId: 'evt_2',
      eventType: 'order.paid',
      payload: ORDER_PAID_PAYLOAD,
    });

    expect(mockPayments.confirmPaid).toHaveBeenCalledWith('order_rzp_1', {
      razorpayPaymentId: 'pay_1',
      method: 'upi',
      amountPaise: 250000,
    });
  });

  it("routes payment.failed to markFailed with the failed attempt's payment id", async () => {
    await service.handleRazorpay({
      eventId: 'evt_3',
      eventType: 'payment.failed',
      payload: PAYMENT_FAILED_PAYLOAD,
    });

    expect(mockPayments.markFailed).toHaveBeenCalledWith(
      'order_rzp_2',
      'pay_2',
    );
  });

  it('does not confirm a payment.captured/order.paid event that carries no amount (webhook price authority)', async () => {
    const payloadWithoutAmount = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: { id: 'pay_1', order_id: 'order_rzp_1', method: 'upi' },
        },
      },
    };

    await service.handleRazorpay({
      eventId: 'evt_6',
      eventType: 'payment.captured',
      payload: payloadWithoutAmount,
    });

    expect(mockPayments.confirmPaid).not.toHaveBeenCalled();
    // Still marked processed — this is a malformed signed event, not a retry target.
    expect(mockPrisma.webhookEvent.updateMany).toHaveBeenCalled();
  });

  it('is a no-op on a replayed event that already finished processing', async () => {
    mockPrisma.webhookEvent.findFirst.mockResolvedValue({
      processed_at: new Date(),
    });

    await service.handleRazorpay({
      eventId: 'evt_1',
      eventType: 'payment.captured',
      payload: PAYMENT_CAPTURED_PAYLOAD,
    });

    expect(mockPayments.confirmPaid).not.toHaveBeenCalled();
    expect(mockPrisma.webhookEvent.create).not.toHaveBeenCalled();
  });

  it('reprocesses an event recorded but never finished (crash-recovery, not a silent skip)', async () => {
    mockPrisma.webhookEvent.findFirst.mockResolvedValue({
      processed_at: null,
    });

    await service.handleRazorpay({
      eventId: 'evt_1',
      eventType: 'payment.captured',
      payload: PAYMENT_CAPTURED_PAYLOAD,
    });

    // Already recorded — don't insert again — but still process, since
    // confirmPaid is itself idempotent and a crash before processed_at must
    // not permanently strand the order in PENDING_PAYMENT.
    expect(mockPrisma.webhookEvent.create).not.toHaveBeenCalled();
    expect(mockPayments.confirmPaid).toHaveBeenCalledTimes(1);
  });

  it('falls back gracefully to the concurrent-insert row when create() races (P2002)', async () => {
    mockPrisma.webhookEvent.create.mockRejectedValue(p2002());
    mockPrisma.webhookEvent.findFirst
      .mockResolvedValueOnce(null) // initial check: not seen yet
      .mockResolvedValueOnce({ processed_at: null }); // post-P2002 recheck: unfinished

    await service.handleRazorpay({
      eventId: 'evt_1',
      eventType: 'payment.captured',
      payload: PAYMENT_CAPTURED_PAYLOAD,
    });

    expect(mockPayments.confirmPaid).toHaveBeenCalledTimes(1);
  });

  it('does nothing for an event with no extractable order id', async () => {
    await service.handleRazorpay({
      eventId: 'evt_4',
      eventType: 'payment.captured',
      payload: { event: 'payment.captured', payload: {} },
    });

    expect(mockPayments.confirmPaid).not.toHaveBeenCalled();
    // Still marked processed — a malformed-but-verified event shouldn't retry forever.
    expect(mockPrisma.webhookEvent.updateMany).toHaveBeenCalled();
  });

  it('ignores unrecognised event types without erroring', async () => {
    await expect(
      service.handleRazorpay({
        eventId: 'evt_5',
        eventType: 'refund.processed',
        payload: {},
      }),
    ).resolves.toBeUndefined();
    expect(mockPayments.confirmPaid).not.toHaveBeenCalled();
    expect(mockPayments.markFailed).not.toHaveBeenCalled();
  });
});
