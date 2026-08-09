import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
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

function refundPayload(
  event: 'refund.created' | 'refund.processed',
  refundId: string,
  amount: number,
  paymentId = 'pay_1',
) {
  return {
    event,
    payload: {
      refund: {
        entity: {
          id: refundId,
          entity: 'refund',
          payment_id: paymentId,
          amount,
        },
      },
    },
  };
}

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

interface RefundLedgerCreateManyArgs {
  data: Array<{
    provider: string;
    event_id: string;
    event_type: string;
    payload: unknown;
    processed_at: Date;
  }>;
  skipDuplicates: boolean;
}

const mockRefundTx = {
  webhookEvent: {
    createMany: jest.fn<
      Promise<{ count: number }>,
      [RefundLedgerCreateManyArgs]
    >(),
  },
  payment: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
  order: { update: jest.fn() },
  // Present only to prove refund synchronization never restocks inventory.
  productVariant: { update: jest.fn() },
};

const mockPrisma = {
  $transaction: jest.fn((cb: (tx: typeof mockRefundTx) => unknown) =>
    cb(mockRefundTx),
  ),
  webhookEvent: {
    findFirst: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn<
      Promise<{ count: number }>,
      [WebhookEventUpdateManyArgs]
    >(),
  },
  order: {
    findUnique: jest.fn(),
  },
};

const mockPayments = {
  confirmPaid: jest.fn(),
  markFailed: jest.fn(),
  releaseByOrderId: jest.fn(),
};

describe('WebhooksService — idempotency + routing (§12 #4)', () => {
  let service: WebhooksService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Some refund paths intentionally stop after the first lookup. Reset queued
    // one-shot results so an unused post-increment fixture cannot leak into the
    // next test.
    mockRefundTx.payment.findUnique.mockReset();
    mockRefundTx.webhookEvent.createMany.mockReset();
    mockRefundTx.payment.updateMany.mockReset();
    mockPrisma.webhookEvent.findFirst.mockResolvedValue(null);
    mockPrisma.webhookEvent.create.mockResolvedValue({});
    mockPrisma.webhookEvent.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.order.findUnique.mockResolvedValue(null);
    mockPayments.releaseByOrderId.mockResolvedValue(undefined);
    mockPrisma.$transaction.mockImplementation(
      (cb: (tx: typeof mockRefundTx) => unknown) => cb(mockRefundTx),
    );
    mockRefundTx.webhookEvent.createMany.mockResolvedValue({ count: 1 });
    mockRefundTx.payment.findUnique.mockResolvedValue(null);
    mockRefundTx.payment.updateMany.mockResolvedValue({ count: 1 });
    mockRefundTx.payment.update.mockResolvedValue({});
    mockRefundTx.order.update.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentsService, useValue: mockPayments },
      ],
    }).compile();
    service = module.get<WebhooksService>(WebhooksService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
        eventType: 'subscription.activated',
        payload: {},
      }),
    ).resolves.toBeUndefined();
    expect(mockPayments.confirmPaid).not.toHaveBeenCalled();
    expect(mockPayments.markFailed).not.toHaveBeenCalled();
  });

  describe('refund synchronization — Phase 6.10', () => {
    function arrangeRefund(args: {
      paymentAmount?: number;
      alreadyRefunded?: number;
      refundAmount: number;
      orderStatus?:
        | 'PENDING_PAYMENT'
        | 'PAID'
        | 'PROCESSING'
        | 'SHIPPED'
        | 'DELIVERED'
        | 'PARTIALLY_REFUNDED';
    }) {
      const paymentAmount = args.paymentAmount ?? 250000;
      const alreadyRefunded = args.alreadyRefunded ?? 0;
      const orderStatus = args.orderStatus ?? 'PAID';
      mockRefundTx.payment.findUnique
        .mockResolvedValueOnce({
          id: 'payment-db-1',
          amount_paise: paymentAmount,
          refunded_paise: alreadyRefunded,
          order: {
            id: 'order-db-1',
            order_number: 'SF-2026-000123',
            status: orderStatus,
          },
        })
        .mockResolvedValueOnce({
          amount_paise: paymentAmount,
          refunded_paise: alreadyRefunded + args.refundAmount,
          order: {
            id: 'order-db-1',
            order_number: 'SF-2026-000123',
            status: orderStatus,
          },
        });
    }

    it('applies a full refund atomically and leaves inventory unchanged', async () => {
      arrangeRefund({ refundAmount: 250000 });
      const payload = refundPayload('refund.processed', 'rfnd_full', 250000);

      await service.handleRazorpay({
        eventId: 'evt_refund_full',
        eventType: 'refund.processed',
        payload,
      });

      const [claimArgs] = mockRefundTx.webhookEvent.createMany.mock.calls[0];
      expect(claimArgs.skipDuplicates).toBe(true);
      expect(claimArgs.data[0]).toMatchObject({
        provider: 'RAZORPAY',
        event_id: 'refund:rfnd_full',
        event_type: 'refund.sync',
        payload,
      });
      expect(claimArgs.data[0].processed_at).toBeInstanceOf(Date);
      expect(mockRefundTx.payment.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'payment-db-1',
          refunded_paise: { lte: 0 },
        },
        data: { refunded_paise: { increment: 250000 } },
      });
      expect(mockRefundTx.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-db-1' },
        data: { status: 'REFUNDED' },
      });
      expect(mockRefundTx.order.update).toHaveBeenCalledWith({
        where: { id: 'order-db-1' },
        data: { status: 'REFUNDED' },
      });
      expect(mockRefundTx.productVariant.update).not.toHaveBeenCalled();
    });

    it('accumulates two different partial refunds and promotes partial to full', async () => {
      arrangeRefund({ refundAmount: 100000 });
      arrangeRefund({
        alreadyRefunded: 100000,
        refundAmount: 150000,
        orderStatus: 'PARTIALLY_REFUNDED',
      });

      await service.handleRazorpay({
        eventId: 'evt_partial_1',
        eventType: 'refund.created',
        payload: refundPayload('refund.created', 'rfnd_partial_1', 100000),
      });
      await service.handleRazorpay({
        eventId: 'evt_partial_2',
        eventType: 'refund.processed',
        payload: refundPayload('refund.processed', 'rfnd_partial_2', 150000),
      });

      expect(mockRefundTx.payment.updateMany).toHaveBeenNthCalledWith(1, {
        where: {
          id: 'payment-db-1',
          refunded_paise: { lte: 150000 },
        },
        data: { refunded_paise: { increment: 100000 } },
      });
      expect(mockRefundTx.payment.updateMany).toHaveBeenNthCalledWith(2, {
        where: {
          id: 'payment-db-1',
          refunded_paise: { lte: 100000 },
        },
        data: { refunded_paise: { increment: 150000 } },
      });
      expect(mockRefundTx.payment.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'payment-db-1' },
        data: { status: 'PARTIALLY_REFUNDED' },
      });
      expect(mockRefundTx.payment.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'payment-db-1' },
        data: { status: 'REFUNDED' },
      });
      expect(mockRefundTx.order.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'order-db-1' },
        data: { status: 'PARTIALLY_REFUNDED' },
      });
      expect(mockRefundTx.order.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'order-db-1' },
        data: { status: 'REFUNDED' },
      });
    });

    it('is a no-op when Razorpay replays a processed refund event id', async () => {
      mockPrisma.webhookEvent.findFirst.mockResolvedValue({
        processed_at: new Date(),
      });

      await service.handleRazorpay({
        eventId: 'evt_refund_replay',
        eventType: 'refund.processed',
        payload: refundPayload('refund.processed', 'rfnd_replay', 50000),
      });

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockRefundTx.payment.updateMany).not.toHaveBeenCalled();
    });

    it('applies one refund entity only once across created and processed lifecycle events', async () => {
      arrangeRefund({ refundAmount: 50000 });
      mockRefundTx.webhookEvent.createMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      await service.handleRazorpay({
        eventId: 'evt_refund_created',
        eventType: 'refund.created',
        payload: refundPayload('refund.created', 'rfnd_same', 50000),
      });
      await service.handleRazorpay({
        eventId: 'evt_refund_processed',
        eventType: 'refund.processed',
        payload: refundPayload('refund.processed', 'rfnd_same', 50000),
      });

      expect(mockRefundTx.webhookEvent.createMany).toHaveBeenCalledTimes(2);
      expect(mockRefundTx.payment.updateMany).toHaveBeenCalledTimes(1);
      expect(mockRefundTx.payment.update).toHaveBeenCalledTimes(1);
      expect(mockRefundTx.order.update).toHaveBeenCalledTimes(1);
      // Both raw deliveries are acknowledged even though only one may mutate.
      expect(mockPrisma.webhookEvent.updateMany).toHaveBeenCalledTimes(2);
    });

    it('acknowledges an unknown payment id with a warning and no mutation', async () => {
      const warn = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
      mockRefundTx.payment.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.handleRazorpay({
          eventId: 'evt_unknown_payment',
          eventType: 'refund.created',
          payload: refundPayload(
            'refund.created',
            'rfnd_unknown',
            50000,
            'pay_unknown',
          ),
        }),
      ).resolves.toBeUndefined();

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'no Payment for razorpay_payment_id=pay_unknown',
        ),
      );
      expect(mockRefundTx.payment.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.webhookEvent.updateMany).toHaveBeenCalled();
    });

    it.each(['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const)(
      'allows a refund transition from %s',
      async (orderStatus) => {
        arrangeRefund({ refundAmount: 250000, orderStatus });

        await service.handleRazorpay({
          eventId: `evt_from_${orderStatus}`,
          eventType: 'refund.processed',
          payload: refundPayload(
            'refund.processed',
            `rfnd_from_${orderStatus}`,
            250000,
          ),
        });

        expect(mockRefundTx.order.update).toHaveBeenCalledWith({
          where: { id: 'order-db-1' },
          data: { status: 'REFUNDED' },
        });
      },
    );

    it('logs an illegal source status loudly, returns successfully, and mutates nothing', async () => {
      const error = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      arrangeRefund({
        refundAmount: 250000,
        orderStatus: 'PENDING_PAYMENT',
      });

      await expect(
        service.handleRazorpay({
          eventId: 'evt_illegal_refund',
          eventType: 'refund.processed',
          payload: refundPayload('refund.processed', 'rfnd_illegal', 250000),
        }),
      ).resolves.toBeUndefined();

      expect(error).toHaveBeenCalledWith(
        expect.stringContaining(
          'cannot transition order SF-2026-000123 from PENDING_PAYMENT to REFUNDED',
        ),
      );
      expect(mockRefundTx.payment.updateMany).not.toHaveBeenCalled();
      expect(mockRefundTx.payment.update).not.toHaveBeenCalled();
      expect(mockRefundTx.order.update).not.toHaveBeenCalled();
      expect(mockPrisma.webhookEvent.updateMany).toHaveBeenCalled();
    });

    it('logs and acknowledges an invalid refund payload without creating a mutation claim', async () => {
      const error = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      await expect(
        service.handleRazorpay({
          eventId: 'evt_invalid_refund',
          eventType: 'refund.created',
          payload: refundPayload('refund.created', 'rfnd_invalid', 0),
        }),
      ).resolves.toBeUndefined();

      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('carried an invalid refund entity'),
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockRefundTx.payment.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.webhookEvent.updateMany).toHaveBeenCalled();
    });

    it('does not acknowledge an unexpected database failure so Razorpay can retry', async () => {
      arrangeRefund({ refundAmount: 50000 });
      mockRefundTx.payment.updateMany.mockRejectedValueOnce(
        new Error('database unavailable'),
      );

      await expect(
        service.handleRazorpay({
          eventId: 'evt_retryable_refund',
          eventType: 'refund.created',
          payload: refundPayload('refund.created', 'rfnd_retryable', 50000),
        }),
      ).rejects.toThrow('database unavailable');

      expect(mockPrisma.webhookEvent.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('order.expired — C9 belt-and-suspenders (D41)', () => {
    const ORDER_EXPIRED_PAYLOAD = {
      event: 'order.expired',
      payload: {
        order: { entity: { id: 'order_rzp_expired' } },
      },
    };

    it('calls releaseByOrderId with the backend order id when the Razorpay order matches', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'backend-order-uuid',
      });

      await service.handleRazorpay({
        eventId: 'evt_exp_1',
        eventType: 'order.expired',
        payload: ORDER_EXPIRED_PAYLOAD,
      });

      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { razorpay_order_id: 'order_rzp_expired' },
        select: { id: true },
      });
      expect(mockPayments.releaseByOrderId).toHaveBeenCalledWith(
        'backend-order-uuid',
      );
      // Event still marked processed so Razorpay won't keep retrying it.
      expect(mockPrisma.webhookEvent.updateMany).toHaveBeenCalled();
    });

    it('logs a warning and skips release when no backend order matches the Razorpay order id', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await service.handleRazorpay({
        eventId: 'evt_exp_2',
        eventType: 'order.expired',
        payload: ORDER_EXPIRED_PAYLOAD,
      });

      expect(mockPayments.releaseByOrderId).not.toHaveBeenCalled();
      // Event is still marked processed (it was received and handled — we just have no matching order).
      expect(mockPrisma.webhookEvent.updateMany).toHaveBeenCalled();
    });

    it('does not call releaseByOrderId or markFailed for order.expired', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'backend-order-uuid',
      });

      await service.handleRazorpay({
        eventId: 'evt_exp_3',
        eventType: 'order.expired',
        payload: ORDER_EXPIRED_PAYLOAD,
      });

      expect(mockPayments.markFailed).not.toHaveBeenCalled();
      expect(mockPayments.confirmPaid).not.toHaveBeenCalled();
    });
  });
});
