import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import type { CurrentCustomerData } from '../customer-auth/strategies/customer-jwt.strategy.js';

const mockService = {
  verifyCallback: jest.fn(),
};

const customer: CurrentCustomerData = {
  customerId: 'cust-1',
  email: 'jane@example.com',
  emailVerified: true,
};

describe('PaymentsController', () => {
  let controller: PaymentsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('delegates a valid callback to the service and returns the order', async () => {
    const order = { id: 'order-1', status: 'PAID' };
    mockService.verifyCallback.mockResolvedValue(order);

    const dto = {
      razorpayOrderId: 'order_rzp_1',
      razorpayPaymentId: 'pay_1',
      razorpaySignature: 'sig',
    };
    const result = await controller.verify(customer, dto);

    expect(mockService.verifyCallback).toHaveBeenCalledWith(customer, dto);
    expect(result).toEqual(order);
  });

  it('propagates a 400 from the service on a tampered signature — order untouched', async () => {
    mockService.verifyCallback.mockRejectedValue(
      new BadRequestException('Invalid payment signature'),
    );

    await expect(
      controller.verify(customer, {
        razorpayOrderId: 'order_rzp_1',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'tampered',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
