import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { AdminOrdersController } from './admin-orders.controller.js';
import { AdminOrdersService } from './admin-orders.service.js';

const mockAdminOrders = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  updateStatus: jest.fn(),
};

describe('AdminOrdersController', () => {
  let controller: AdminOrdersController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOrdersController],
      providers: [{ provide: AdminOrdersService, useValue: mockAdminOrders }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminOrdersController>(AdminOrdersController);
  });

  it('protects the controller with the admin JWT guard', () => {
    const guards = Reflect.getMetadata(
      '__guards__',
      AdminOrdersController,
    ) as unknown;
    expect(guards).toContain(JwtAuthGuard);
  });

  it('delegates the paginated list query', async () => {
    const query = { page: 2, limit: 10, status: 'PAID' as const };
    mockAdminOrders.findAll.mockResolvedValue({
      orders: [],
      total: 0,
      ...query,
    });

    await expect(controller.findAll(query)).resolves.toEqual({
      orders: [],
      total: 0,
      page: 2,
      limit: 10,
      status: 'PAID',
    });
    expect(mockAdminOrders.findAll).toHaveBeenCalledWith(query);
  });

  it('delegates detail and status update requests', async () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const detail = { id, status: 'PROCESSING' };
    mockAdminOrders.findOne.mockResolvedValue(detail);
    mockAdminOrders.updateStatus.mockResolvedValue(detail);

    await expect(controller.findOne(id)).resolves.toBe(detail);
    await expect(
      controller.updateStatus(id, { status: 'PROCESSING' }),
    ).resolves.toBe(detail);
    expect(mockAdminOrders.findOne).toHaveBeenCalledWith(id);
    expect(mockAdminOrders.updateStatus).toHaveBeenCalledWith(id, 'PROCESSING');
  });

  it('propagates illegal transition errors from the service', async () => {
    mockAdminOrders.updateStatus.mockRejectedValue(
      new BadRequestException('Invalid order status transition'),
    );

    await expect(
      controller.updateStatus('550e8400-e29b-41d4-a716-446655440000', {
        status: 'DELIVERED',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
