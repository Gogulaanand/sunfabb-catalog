import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OrdersService } from '../../orders/orders.service.js';
import { AdminOrdersService } from './admin-orders.service.js';

const ORDER_LIST_ROW = {
  id: 'order-1',
  order_number: 'SF-2026-000123',
  status: 'PAID',
  total_paise: 125000,
  created_at: new Date('2026-07-18T08:30:00.000Z'),
  customer: { full_name: 'Jane Doe', email: 'jane@example.com' },
  _count: { items: 2 },
};

const ORDER_DETAIL_ROW = {
  id: 'order-1',
  order_number: 'SF-2026-000123',
  customer_id: 'customer-1',
  status: 'PAID',
  email: 'jane@example.com',
  subtotal_paise: 10000,
  shipping_paise: 0,
  tax_paise: 0,
  discount_paise: 0,
  total_paise: 10000,
  currency: 'INR',
  shipping_address: { full_name: 'Jane Doe', city: 'Bengaluru' },
  billing_address: null,
  razorpay_order_id: 'order_rzp_1',
  razorpay_payment_id: 'pay_1',
  invoice_number: null,
  placed_at: new Date('2026-07-18T08:35:00.000Z'),
  created_at: new Date('2026-07-18T08:30:00.000Z'),
  updated_at: new Date('2026-07-18T08:35:00.000Z'),
  customer: {
    full_name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '9876543210',
  },
  items: [
    {
      id: 'item-1',
      variant_id: 'variant-1',
      product_name: 'Royal Bedspread',
      variant_label: 'King · Indigo · 100% Cotton',
      sku: 'SKU-1',
      hsn_code: '6304',
      unit_price_paise: 5000,
      quantity: 2,
      tax_rate_bps: 0,
      cgst_paise: 0,
      sgst_paise: 0,
      igst_paise: 0,
      line_total_paise: 10000,
    },
  ],
  payments: [
    {
      id: 'payment-1',
      razorpay_payment_id: 'pay_1',
      razorpay_order_id: 'order_rzp_1',
      amount_paise: 10000,
      status: 'CAPTURED',
      method: 'upi',
      refunded_paise: 0,
      created_at: new Date('2026-07-18T08:35:00.000Z'),
      updated_at: new Date('2026-07-18T08:35:00.000Z'),
    },
  ],
  shipment: null,
};

const mockPrisma = {
  order: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockOrdersService = {
  transition: jest.fn(),
};

describe('AdminOrdersService', () => {
  let service: AdminOrdersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminOrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();

    service = module.get<AdminOrdersService>(AdminOrdersService);
  });

  it('lists newest orders with status/date filters and Prisma item counts', async () => {
    mockPrisma.order.findMany.mockResolvedValue([ORDER_LIST_ROW]);
    mockPrisma.order.count.mockResolvedValue(1);

    await expect(
      service.findAll({
        page: 2,
        limit: 10,
        status: 'PAID',
        date_from: '2026-07-01',
        date_to: '2026-07-18',
      }),
    ).resolves.toEqual({
      orders: [
        expect.objectContaining({
          order_number: 'SF-2026-000123',
          item_count: 2,
        }),
      ],
      total: 1,
      page: 2,
      limit: 10,
    });

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'PAID',
          created_at: {
            gte: new Date('2026-07-01T00:00:00.000Z'),
            lt: new Date('2026-07-19T00:00:00.000Z'),
          },
        },
        orderBy: { created_at: 'desc' },
        skip: 10,
        take: 10,
        include: {
          customer: { select: { full_name: true, email: true } },
          _count: { select: { items: true } },
        },
      }),
    );
  });

  it('rejects a date range whose start is after its end', async () => {
    await expect(
      service.findAll({ date_from: '2026-07-19', date_to: '2026-07-18' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
  });

  it('maps detail fields and computes legal next statuses from the shared state machine', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(ORDER_DETAIL_ROW);

    await expect(service.findOne('order-1')).resolves.toMatchObject({
      order_number: 'SF-2026-000123',
      customer: {
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '9876543210',
      },
      items: [
        {
          product_name: 'Royal Bedspread',
          unit_price_paise: 5000,
          quantity: 2,
        },
      ],
      payments: [
        {
          status: 'CAPTURED',
          amount_paise: 10000,
          razorpay_payment_id: 'pay_1',
        },
      ],
      allowed_next_statuses: [
        'PROCESSING',
        'CANCELLED',
        'REFUNDED',
        'PARTIALLY_REFUNDED',
      ],
    });
  });

  it('throws 404 for an unknown order', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('delegates status changes to OrdersService.transition and refreshes detail', async () => {
    mockPrisma.order.findUnique
      .mockResolvedValueOnce({ id: 'order-1', status: 'PAID' })
      .mockResolvedValueOnce(ORDER_DETAIL_ROW);
    mockOrdersService.transition.mockResolvedValue({
      id: 'order-1',
      status: 'PROCESSING',
    });

    await service.updateStatus('order-1', 'PROCESSING');

    expect(mockOrdersService.transition).toHaveBeenCalledWith(
      { id: 'order-1', status: 'PAID' },
      'PROCESSING',
    );
    expect(mockPrisma.order.findUnique).toHaveBeenCalledTimes(2);
  });
});
