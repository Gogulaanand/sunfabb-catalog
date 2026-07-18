import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OrdersService } from '../../orders/orders.service.js';
import { AdminOrdersController } from './admin-orders.controller.js';
import { AdminOrdersService } from './admin-orders.service.js';

const ORDER_ID = '550e8400-e29b-41d4-a716-446655440000';

const DETAIL = {
  id: ORDER_ID,
  order_number: 'SF-2026-000123',
  status: 'PAID',
  allowed_next_statuses: [
    'PROCESSING',
    'CANCELLED',
    'REFUNDED',
    'PARTIALLY_REFUNDED',
  ],
};

const mockPrisma = {
  order: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
};

describe('Admin orders HTTP contract', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [AdminOrdersController],
      providers: [
        AdminOrdersService,
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('serves the protected list, detail, and legal status routes through real services', async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.order.count.mockResolvedValue(0);
    mockPrisma.order.findUnique
      .mockResolvedValueOnce(DETAIL)
      .mockResolvedValueOnce({ ...DETAIL, status: 'PAID' })
      .mockResolvedValueOnce({ ...DETAIL, status: 'PROCESSING' })
      .mockResolvedValueOnce({ ...DETAIL, status: 'PROCESSING' });
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });

    await request(app.getHttpServer())
      .get('/admin/orders')
      .query({
        page: '1',
        status: 'PAID',
        date_from: '2026-07-01',
        date_to: '2026-07-18',
      })
      .expect(200)
      .expect({ orders: [], total: 0, page: 1, limit: 20 });

    await request(app.getHttpServer())
      .get(`/admin/orders/${ORDER_ID}`)
      .expect(200)
      .expect(DETAIL);

    await request(app.getHttpServer())
      .patch(`/admin/orders/${ORDER_ID}/status`)
      .send({ status: 'PROCESSING' })
      .expect(200)
      .expect({
        ...DETAIL,
        status: 'PROCESSING',
        allowed_next_statuses: [
          'SHIPPED',
          'CANCELLED',
          'REFUNDED',
          'PARTIALLY_REFUNDED',
        ],
      });

    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: ORDER_ID, status: 'PAID' },
      data: { status: 'PROCESSING' },
    });
  });

  it('rejects malformed status, UUID, and unknown body fields with 400', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/orders/${ORDER_ID}/status`)
      .send({ status: 'NOT_A_STATUS' })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/admin/orders/${ORDER_ID}/status`)
      .send({ status: 'PROCESSING', unexpected: true })
      .expect(400);

    await request(app.getHttpServer())
      .get('/admin/orders/not-a-uuid')
      .expect(400);
  });

  it('rejects an illegal transition with 400 before persistence', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: ORDER_ID,
      status: 'PAID',
    });

    await request(app.getHttpServer())
      .patch(`/admin/orders/${ORDER_ID}/status`)
      .send({ status: 'DELIVERED' })
      .expect(400);

    expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
  });
});
