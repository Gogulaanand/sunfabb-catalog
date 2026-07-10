import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RazorpayService } from './razorpay.service.js';
import { EmailService } from '../email/email.service.js';

const ORDER = {
  id: 'order-1',
  order_number: 'SF-2026-000123',
  total_paise: 250000,
};

// Typed so `.mock.calls` isn't `any` — the placed_at timestamp is real (new
// Date()), so the confirmPaid test below inspects the call args directly
// instead of nesting expect.any(Date) inside a plain-object property.
interface OrderUpdateManyArgs {
  where: { id: string; status: string };
  data: { status: string; placed_at: Date; razorpay_payment_id: string };
}

// Transaction client — used both by createForOrder (persist Payment + link the
// Razorpay order id) and releaseByOrderId (stock release on failure).
const mockTx = {
  order: { update: jest.fn(), updateMany: jest.fn() },
  orderItem: { findMany: jest.fn() },
  productVariant: { update: jest.fn() },
  payment: { create: jest.fn(), updateMany: jest.fn() },
};

const mockPrisma = {
  $transaction: jest.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
  payment: { updateMany: jest.fn() },
  order: {
    updateMany: jest.fn<Promise<{ count: number }>, [OrderUpdateManyArgs]>(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
};

const mockRazorpay = {
  createOrder: jest.fn(),
  getKeyId: jest.fn(),
  verifyPaymentSignature: jest.fn(),
};

const mockEmail = {
  sendOrderConfirmation: jest.fn(),
};

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockEmail.sendOrderConfirmation.mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RazorpayService, useValue: mockRazorpay },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();
    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('createForOrder', () => {
    it('creates a Razorpay order for the server total and persists a CREATED Payment', async () => {
      mockRazorpay.createOrder.mockResolvedValue({
        id: 'order_rzp_1',
        amount: 250000,
        currency: 'INR',
        status: 'created',
      });
      mockRazorpay.getKeyId.mockReturnValue('rzp_test_key');

      const result = await service.createForOrder(ORDER);

      // The amount handed to Razorpay is the DB order's total — never a client value.
      expect(mockRazorpay.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          amountPaise: 250000,
          receipt: ORDER.order_number,
        }),
      );
      expect(mockTx.payment.create).toHaveBeenCalledWith({
        data: {
          order_id: ORDER.id,
          razorpay_order_id: 'order_rzp_1',
          amount_paise: 250000,
          status: 'CREATED',
        },
      });
      expect(mockTx.order.update).toHaveBeenCalledWith({
        where: { id: ORDER.id },
        data: { razorpay_order_id: 'order_rzp_1' },
      });
      expect(result).toEqual({
        key: 'rzp_test_key',
        razorpayOrderId: 'order_rzp_1',
        amountPaise: 250000,
        currency: 'INR',
        orderNumber: ORDER.order_number,
      });
    });

    it('releases reserved stock and marks PAYMENT_FAILED if Razorpay order creation fails', async () => {
      mockRazorpay.createOrder.mockRejectedValue(new Error('network error'));
      mockTx.order.updateMany.mockResolvedValue({ count: 1 });
      mockTx.orderItem.findMany.mockResolvedValue([
        { variant_id: 'v1', quantity: 2 },
      ]);

      await expect(service.createForOrder(ORDER)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockTx.order.updateMany).toHaveBeenCalledWith({
        where: { id: ORDER.id, status: 'PENDING_PAYMENT' },
        data: { status: 'PAYMENT_FAILED' },
      });
      expect(mockTx.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: { stock_quantity: { increment: 2 } },
      });
      // The Payment row is never created for a failed SDK call.
      expect(mockTx.payment.create).not.toHaveBeenCalled();
    });

    it('releases reserved stock if the Razorpay order is created but persisting it to the DB fails', async () => {
      // The SDK call succeeds, so there IS now a live Razorpay order — but if we
      // can't record its id, this DB order can never be looked up by
      // confirmPaid/markFailed again (both key off razorpay_order_id). Found by
      // code review as an unhandled compensation gap (D40).
      mockRazorpay.createOrder.mockResolvedValue({
        id: 'order_rzp_1',
        amount: 250000,
        currency: 'INR',
        status: 'created',
      });
      mockPrisma.$transaction.mockImplementationOnce(() => {
        throw new Error('connection dropped');
      });
      mockTx.order.updateMany.mockResolvedValue({ count: 1 });
      mockTx.orderItem.findMany.mockResolvedValue([
        { variant_id: 'v1', quantity: 2 },
      ]);

      await expect(service.createForOrder(ORDER)).rejects.toThrow(
        'connection dropped',
      );

      expect(mockTx.order.updateMany).toHaveBeenCalledWith({
        where: { id: ORDER.id, status: 'PENDING_PAYMENT' },
        data: { status: 'PAYMENT_FAILED' },
      });
      expect(mockTx.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: { stock_quantity: { increment: 2 } },
      });
    });
  });

  describe('confirmPaid (idempotent — §12 #4)', () => {
    function arrangeOrder() {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: ORDER.id,
        total_paise: ORDER.total_paise,
        email: 'jane@example.com',
        order_number: ORDER.order_number,
      });
    }

    it('flips PENDING_PAYMENT -> PAID exactly once and sends one confirmation email', async () => {
      arrangeOrder();
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });

      await service.confirmPaid('order_rzp_1', {
        razorpayPaymentId: 'pay_1',
        method: 'upi',
      });

      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith({
        where: { razorpay_order_id: 'order_rzp_1' },
        data: {
          razorpay_payment_id: 'pay_1',
          method: 'upi',
          status: 'CAPTURED',
        },
      });
      const [flipArgs] = mockPrisma.order.updateMany.mock.calls[0];
      expect(flipArgs.where).toEqual({
        id: ORDER.id,
        status: 'PENDING_PAYMENT',
      });
      expect(flipArgs.data.status).toBe('PAID');
      expect(flipArgs.data.razorpay_payment_id).toBe('pay_1');
      expect(flipArgs.data.placed_at).toBeInstanceOf(Date);
      expect(mockEmail.sendOrderConfirmation).toHaveBeenCalledTimes(1);
    });

    it('is a no-op on replay: second call after already PAID sends no second email', async () => {
      arrangeOrder();
      // Order already PAID — the conditional update matches nothing.
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      await service.confirmPaid('order_rzp_1', { razorpayPaymentId: 'pay_1' });

      // Payment detail update still runs (idempotent), but no email on a no-op flip.
      expect(mockEmail.sendOrderConfirmation).not.toHaveBeenCalled();
    });

    it('records payment method from the webhook even if the callback already flipped status', async () => {
      arrangeOrder();
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 }); // callback already won
      await service.confirmPaid('order_rzp_1', {
        razorpayPaymentId: 'pay_1',
        method: 'card',
      });
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith({
        where: { razorpay_order_id: 'order_rzp_1' },
        data: {
          razorpay_payment_id: 'pay_1',
          method: 'card',
          status: 'CAPTURED',
        },
      });
    });

    it('does not confirm and does not flip status when the charged amount mismatches the order total', async () => {
      arrangeOrder();
      await service.confirmPaid('order_rzp_1', {
        razorpayPaymentId: 'pay_1',
        amountPaise: 999999,
      });
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.payment.updateMany).not.toHaveBeenCalled();
    });

    it('is a safe no-op when no order matches the razorpay_order_id', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(
        service.confirmPaid('order_unknown', { razorpayPaymentId: 'pay_1' }),
      ).resolves.toBeUndefined();
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('markFailed (per-attempt only — does NOT release stock or touch order status)', () => {
    // Razorpay lets a customer retry a failed attempt on the SAME order_id, so
    // a single payment.failed must never be treated as order-terminal. An
    // earlier version of this method released stock here — caught by security
    // + code review as a real money/stock-correctness bug (D40) before it shipped.
    it('records the failed attempt on the Payment row without touching order status or stock', async () => {
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });

      await service.markFailed('order_rzp_1', 'pay_1');

      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith({
        where: {
          razorpay_order_id: 'order_rzp_1',
          status: { not: 'CAPTURED' },
        },
        data: { status: 'FAILED', razorpay_payment_id: 'pay_1' },
      });
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockTx.productVariant.update).not.toHaveBeenCalled();
    });

    it('is idempotent on a replayed failure webhook for the same attempt', async () => {
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });
      await service.markFailed('order_rzp_1', 'pay_1');
      await service.markFailed('order_rzp_1', 'pay_1');
      expect(mockPrisma.payment.updateMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('does not overwrite an already-CAPTURED payment (a later attempt already succeeded)', async () => {
      // The `status: { not: 'CAPTURED' } }` guard matches nothing once captured.
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.markFailed('order_rzp_1', 'pay_1'),
      ).resolves.toBeUndefined();
    });

    // The exact bug security + code review caught: a failed attempt followed by
    // a successful retry on the SAME razorpay_order_id must still confirm.
    it('a failed attempt followed by a successful retry on the same order still reaches PAID', async () => {
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 }); // markFailed's update
      await service.markFailed('order_rzp_1', 'pay_failed');

      mockPrisma.order.findUnique.mockResolvedValue({
        id: ORDER.id,
        total_paise: ORDER.total_paise,
        email: 'jane@example.com',
        order_number: ORDER.order_number,
      });
      mockPrisma.payment.updateMany.mockResolvedValueOnce({ count: 1 }); // confirmPaid's detail update
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 }); // order was still PENDING_PAYMENT

      await service.confirmPaid('order_rzp_1', {
        razorpayPaymentId: 'pay_success',
      });

      const [flipArgs] = mockPrisma.order.updateMany.mock.calls[0];
      expect(flipArgs.data.status).toBe('PAID');
      expect(mockEmail.sendOrderConfirmation).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyCallback (§7.1, §7.2 IDOR)', () => {
    const CUSTOMER = {
      customerId: 'cust-1',
      email: 'jane@example.com',
      emailVerified: true,
    };
    const DTO = {
      razorpayOrderId: 'order_rzp_1',
      razorpayPaymentId: 'pay_1',
      razorpaySignature: 'sig',
    };

    it('rejects a tampered callback signature with 400 and never touches the order', async () => {
      mockRazorpay.verifyPaymentSignature.mockReturnValue(false);

      await expect(service.verifyCallback(CUSTOMER, DTO)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
    });

    it('returns 404 when the order does not belong to the caller (IDOR)', async () => {
      mockRazorpay.verifyPaymentSignature.mockReturnValue(true);
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(service.verifyCallback(CUSTOMER, DTO)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('confirms payment and returns the order on a valid signature for the caller’s own order', async () => {
      mockRazorpay.verifyPaymentSignature.mockReturnValue(true);
      mockPrisma.order.findFirst
        .mockResolvedValueOnce({ id: ORDER.id }) // ownership check
        .mockResolvedValueOnce({ id: ORDER.id, status: 'PAID' }); // final read
      mockPrisma.order.findUnique.mockResolvedValue({
        id: ORDER.id,
        total_paise: ORDER.total_paise,
        email: CUSTOMER.email,
        order_number: ORDER.order_number,
      });
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.verifyCallback(CUSTOMER, DTO);

      expect(result).toEqual({ id: ORDER.id, status: 'PAID' });
    });
  });
});
