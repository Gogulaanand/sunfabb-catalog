import { Test, TestingModule } from '@nestjs/testing';
import { OrderExpiryController } from './order-expiry.controller.js';
import { OrderExpiryService } from './order-expiry.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

const mockOrderExpiry = {
  expireNow: jest.fn(),
};

describe('OrderExpiryController — POST /admin/expiry/orders', () => {
  let controller: OrderExpiryController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderExpiryController],
      providers: [{ provide: OrderExpiryService, useValue: mockOrderExpiry }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(OrderExpiryController);
  });

  it('calls expireNow and returns { expired: n } when orders were swept', async () => {
    mockOrderExpiry.expireNow.mockResolvedValue(3);

    const result = await controller.expire();

    expect(result).toEqual({ expired: 3 });
    expect(mockOrderExpiry.expireNow).toHaveBeenCalledTimes(1);
  });

  it('returns { expired: 0 } when no stale orders exist', async () => {
    mockOrderExpiry.expireNow.mockResolvedValue(0);

    const result = await controller.expire();

    expect(result).toEqual({ expired: 0 });
  });
});
