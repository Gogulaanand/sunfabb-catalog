import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AdminEnquiriesController } from './admin-enquiries.controller.js';
import { AdminEnquiriesService } from './admin-enquiries.service.js';

const mockPrisma = {
  contactMessage: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('Admin enquiries HTTP contract', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [AdminEnquiriesController],
      providers: [
        AdminEnquiriesService,
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

  it('serves a validated paginated newest-first response through the guarded route', async () => {
    const enquiry = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Jane Doe',
      phone: '+919876543210',
      email: 'jane@example.com',
      message: 'Please share the available king-size bedspreads.',
      created_at: new Date('2026-09-12T08:30:00.000Z'),
    };
    mockPrisma.contactMessage.findMany.mockResolvedValue([enquiry]);
    mockPrisma.contactMessage.count.mockResolvedValue(1);

    await request(app.getHttpServer())
      .get('/admin/enquiries')
      .query({ page: '2', limit: '10' })
      .expect(200)
      .expect({
        enquiries: [
          { ...enquiry, created_at: enquiry.created_at.toISOString() },
        ],
        total: 1,
        page: 2,
        limit: 10,
      });
  });

  it('rejects invalid pagination and unknown query fields', async () => {
    await request(app.getHttpServer())
      .get('/admin/enquiries')
      .query({ page: '0' })
      .expect(400);

    await request(app.getHttpServer())
      .get('/admin/enquiries')
      .query({ limit: '101' })
      .expect(400);

    await request(app.getHttpServer())
      .get('/admin/enquiries')
      .query({ unexpected: 'true' })
      .expect(400);
  });
});
