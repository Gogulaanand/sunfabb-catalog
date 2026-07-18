import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { financialYear } from './order-number.js';

const CUSTOMER = {
  customerId: 'cust-1',
  email: 'jane@example.com',
  emailVerified: true,
};

const ADDRESS = {
  id: 'addr-1',
  customer_id: 'cust-1',
  full_name: 'Jane Doe',
  phone: '9876543210',
  line1: '12 MG Road',
  line2: null,
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
  country: 'India',
};

function cartItem(overrides = {}) {
  return {
    quantity: 2,
    variant: {
      id: 'v1',
      price: 5000,
      stock_quantity: 10,
      sku: 'SKU-1',
      size: 'King',
      is_active: true,
      product: { name: 'Royal Bedspread', hsn_code: '6304' },
      material: { name: '100% Cotton' },
      color: { name: 'Indigo' },
      ...overrides,
    },
  };
}

// Transaction client — the callback passed to prisma.$transaction runs against this.
const mockTx = {
  address: { findFirst: jest.fn() },
  cart: { findUnique: jest.fn() },
  productVariant: { updateMany: jest.fn() },
  order: { count: jest.fn(), create: jest.fn() },
  cartItem: { deleteMany: jest.fn() },
};

const mockPrisma = {
  $transaction: jest.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
  order: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<OrdersService>(OrdersService);
  });

  describe('create', () => {
    function arrangeHappyPath() {
      mockTx.address.findFirst.mockResolvedValue(ADDRESS);
      mockTx.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        items: [cartItem()],
      });
      mockTx.productVariant.updateMany.mockResolvedValue({ count: 1 });
      mockTx.order.count.mockResolvedValue(0);
      mockTx.order.create.mockResolvedValue({
        id: 'order-1',
        order_number: 'SF-x-000001',
        status: 'PENDING_PAYMENT',
        items: [],
      });
      mockTx.cartItem.deleteMany.mockResolvedValue({ count: 1 });
    }

    it('creates a PENDING_PAYMENT order with frozen snapshots, decrements stock, clears the cart', async () => {
      arrangeHappyPath();

      const result = await service.create(CUSTOMER, { addressId: 'addr-1' });
      expect(result).toMatchObject({
        id: 'order-1',
        status: 'PENDING_PAYMENT',
      });

      // conditional, race-safe stock reservation
      expect(mockTx.productVariant.updateMany).toHaveBeenCalledWith({
        where: { id: 'v1', is_active: true, stock_quantity: { gte: 2 } },
        data: { stock_quantity: { decrement: 2 } },
      });

      // order + frozen item snapshot + address/email snapshot + correct totals
      const createCalls = mockTx.order.create.mock.calls as Array<
        [
          {
            data: {
              items: { create: Record<string, unknown>[] };
              [key: string]: unknown;
            };
          },
        ]
      >;
      const createArg = createCalls[0][0];
      const fy = financialYear(new Date());
      expect(createArg.data).toMatchObject({
        order_number: `SF-${fy}-000001`,
        customer_id: 'cust-1',
        status: 'PENDING_PAYMENT',
        email: 'jane@example.com',
        subtotal_paise: 10000,
        shipping_paise: 0,
        tax_paise: 0,
        total_paise: 10000,
        shipping_address: {
          full_name: 'Jane Doe',
          line1: '12 MG Road',
          pincode: '560001',
          country: 'India',
        },
      });
      expect(createArg.data.items.create[0]).toMatchObject({
        variant_id: 'v1',
        product_name: 'Royal Bedspread',
        variant_label: 'King · Indigo · 100% Cotton',
        sku: 'SKU-1',
        hsn_code: '6304',
        unit_price_paise: 5000,
        quantity: 2,
        line_total_paise: 10000,
      });

      // cart cleared atomically
      expect(mockTx.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cart_id: 'cart-1' },
      });
    });

    it('decrements stock per line and snapshots every item for a multi-line cart', async () => {
      mockTx.address.findFirst.mockResolvedValue(ADDRESS);
      mockTx.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        items: [
          cartItem(), // v1 × 2 @ 5000 = 10000
          cartItem({ id: 'v2', price: 2500, sku: 'SKU-2' }), // v2 × 2 @ 2500 = 5000
        ],
      });
      mockTx.productVariant.updateMany.mockResolvedValue({ count: 1 });
      mockTx.order.count.mockResolvedValue(0);
      mockTx.order.create.mockResolvedValue({ id: 'order-3', items: [] });
      mockTx.cartItem.deleteMany.mockResolvedValue({ count: 2 });

      await service.create(CUSTOMER, { addressId: 'addr-1' });

      // one conditional decrement per distinct variant
      expect(mockTx.productVariant.updateMany).toHaveBeenCalledTimes(2);

      const createCalls = mockTx.order.create.mock.calls as Array<
        [
          {
            data: {
              subtotal_paise: number;
              total_paise: number;
              items: { create: unknown[] };
            };
          },
        ]
      >;
      const data = createCalls[0][0].data;
      expect(data.subtotal_paise).toBe(15000);
      expect(data.total_paise).toBe(15000);
      expect(data.items.create).toHaveLength(2);
    });

    it('returns 404 for an address that is not the caller’s (IDOR) and reserves no stock', async () => {
      mockTx.address.findFirst.mockResolvedValue(null);
      await expect(
        service.create(CUSTOMER, { addressId: 'addr-foreign' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockTx.productVariant.updateMany).not.toHaveBeenCalled();
      expect(mockTx.order.create).not.toHaveBeenCalled();
    });

    it('returns 400 for an empty cart', async () => {
      mockTx.address.findFirst.mockResolvedValue(ADDRESS);
      mockTx.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [] });
      await expect(
        service.create(CUSTOMER, { addressId: 'addr-1' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockTx.order.create).not.toHaveBeenCalled();
    });

    it('returns 400 when stock cannot be reserved (concurrent oversell / deactivated)', async () => {
      mockTx.address.findFirst.mockResolvedValue(ADDRESS);
      mockTx.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        items: [cartItem()],
      });
      mockTx.productVariant.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.create(CUSTOMER, { addressId: 'addr-1' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockTx.order.create).not.toHaveBeenCalled();
    });

    it('retries on an order_number unique collision, then succeeds', async () => {
      arrangeHappyPath();
      const p2002 = Object.assign(new Error('unique'), { code: 'P2002' });
      mockTx.order.create.mockRejectedValueOnce(p2002).mockResolvedValueOnce({
        id: 'order-2',
        status: 'PENDING_PAYMENT',
        items: [],
      });

      const result = await service.create(CUSTOMER, { addressId: 'addr-1' });
      expect(result).toMatchObject({ id: 'order-2' });
      expect(mockTx.order.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('findAll', () => {
    it('lists the caller’s orders, newest first, paginated', async () => {
      mockPrisma.order.findMany.mockResolvedValue([{ id: 'o1' }]);
      mockPrisma.order.count.mockResolvedValue(1);

      const result = await service.findAll('cust-1', { page: 2, limit: 10 });

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { customer_id: 'cust-1' },
          orderBy: { created_at: 'desc' },
          skip: 10,
          take: 10,
        }),
      );
      expect(result).toEqual({
        orders: [{ id: 'o1' }],
        total: 1,
        page: 2,
        limit: 10,
      });
    });
  });

  describe('findOneByNumber', () => {
    it('returns the caller’s order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'o1',
        order_number: 'SF-2026-000001',
      });
      const result = await service.findOneByNumber('cust-1', 'SF-2026-000001');
      expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { order_number: 'SF-2026-000001', customer_id: 'cust-1' },
        }),
      );
      expect(result).toMatchObject({ id: 'o1' });
    });

    it('returns 404 for another customer’s order number', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);
      await expect(
        service.findOneByNumber('cust-1', 'SF-2026-999999'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('transition', () => {
    it('persists a legal transition only when the current status still matches', async () => {
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        status: 'PAID',
        items: [],
      });

      await service.transition({ id: 'o1', status: 'PENDING_PAYMENT' }, 'PAID');
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'o1', status: 'PENDING_PAYMENT' },
        data: { status: 'PAID' },
      });
      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'o1' },
        include: { items: true },
      });
    });

    it('rejects a stale transition with a conflict without persisting', async () => {
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        status: 'PAID',
      });

      await expect(
        service.transition({ id: 'o1', status: 'PENDING_PAYMENT' }, 'PAID'),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.order.updateMany).toHaveBeenCalledTimes(1);
    });

    it('rejects an unknown order after a conditional update misses', async () => {
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.transition({ id: 'o1', status: 'PENDING_PAYMENT' }, 'PAID'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects an illegal transition without persisting', async () => {
      await expect(
        service.transition(
          { id: 'o1', status: 'PENDING_PAYMENT' },
          'DELIVERED',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });
  });
});
