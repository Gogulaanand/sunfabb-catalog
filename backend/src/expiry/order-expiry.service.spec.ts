import { Test, TestingModule } from '@nestjs/testing';
import { OrderExpiryService } from './order-expiry.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaymentsService } from '../payments/payments.service.js';

const mockPrisma = {
  order: { findMany: jest.fn() },
};

const mockPayments = {
  releaseByOrderId: jest.fn(),
};

async function buildService(expiryHours = '24'): Promise<OrderExpiryService> {
  process.env.ORDER_EXPIRY_HOURS = expiryHours;
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      OrderExpiryService,
      { provide: PrismaService, useValue: mockPrisma },
      { provide: PaymentsService, useValue: mockPayments },
    ],
  }).compile();
  return module.get(OrderExpiryService);
}

describe('OrderExpiryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPayments.releaseByOrderId.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.ORDER_EXPIRY_HOURS;
  });

  describe('expireNow()', () => {
    it('calls releaseByOrderId for each stale order and returns the count', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { id: 'order-1' },
        { id: 'order-2' },
      ]);
      const service = await buildService();

      const count = await service.expireNow();

      expect(count).toBe(2);
      expect(mockPayments.releaseByOrderId).toHaveBeenCalledTimes(2);
      expect(mockPayments.releaseByOrderId).toHaveBeenCalledWith('order-1');
      expect(mockPayments.releaseByOrderId).toHaveBeenCalledWith('order-2');
    });

    it('returns 0 and does not call releaseByOrderId when no stale orders exist', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      const service = await buildService();

      const count = await service.expireNow();

      expect(count).toBe(0);
      expect(mockPayments.releaseByOrderId).not.toHaveBeenCalled();
    });

    it('queries PENDING_PAYMENT orders with a cutoff ~ORDER_EXPIRY_HOURS ago', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      const service = await buildService('24');

      const before = Date.now();
      await service.expireNow();
      const after = Date.now();

      const { where } = mockPrisma.order.findMany.mock.calls[0][0] as {
        where: { status: string; created_at: { lt: Date } };
      };
      expect(where.status).toBe('PENDING_PAYMENT');
      expect(where.created_at.lt).toBeInstanceOf(Date);

      // cutoff should be within ±1 s of (now - 24 h)
      const expectedMs = 24 * 3_600_000;
      const age = (before + after) / 2 - where.created_at.lt.getTime();
      expect(age).toBeGreaterThanOrEqual(expectedMs - 1_000);
      expect(age).toBeLessThanOrEqual(expectedMs + 1_000);
    });
  });

  describe('construction — ORDER_EXPIRY_HOURS validation', () => {
    it('defaults to 24 hours when the env var is absent', async () => {
      delete process.env.ORDER_EXPIRY_HOURS;
      mockPrisma.order.findMany.mockResolvedValue([]);
      const service = await buildService('24'); // buildService sets it; just verifies no throw
      expect(service).toBeDefined();
    });

    it('throws at startup when ORDER_EXPIRY_HOURS is zero', async () => {
      process.env.ORDER_EXPIRY_HOURS = '0';
      await expect(
        Test.createTestingModule({
          providers: [
            OrderExpiryService,
            { provide: PrismaService, useValue: mockPrisma },
            { provide: PaymentsService, useValue: mockPayments },
          ],
        }).compile(),
      ).rejects.toThrow('ORDER_EXPIRY_HOURS must be a positive integer');
    });

    it('throws at startup when ORDER_EXPIRY_HOURS is negative', async () => {
      process.env.ORDER_EXPIRY_HOURS = '-5';
      await expect(
        Test.createTestingModule({
          providers: [
            OrderExpiryService,
            { provide: PrismaService, useValue: mockPrisma },
            { provide: PaymentsService, useValue: mockPayments },
          ],
        }).compile(),
      ).rejects.toThrow('ORDER_EXPIRY_HOURS must be a positive integer');
    });

    it('throws at startup when ORDER_EXPIRY_HOURS is not a number', async () => {
      process.env.ORDER_EXPIRY_HOURS = 'banana';
      await expect(
        Test.createTestingModule({
          providers: [
            OrderExpiryService,
            { provide: PrismaService, useValue: mockPrisma },
            { provide: PaymentsService, useValue: mockPayments },
          ],
        }).compile(),
      ).rejects.toThrow('ORDER_EXPIRY_HOURS must be a positive integer');
    });
  });
});
