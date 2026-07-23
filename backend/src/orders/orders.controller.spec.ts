import { ForbiddenException } from '@nestjs/common';
import type { CurrentCustomerData } from '../customer-auth/strategies/customer-jwt.strategy.js';
import { OrdersController } from './orders.controller.js';

describe('OrdersController', () => {
  const ordersService = {
    create: jest.fn(),
  };
  const paymentsService = {
    createForOrder: jest.fn(),
  };
  let controller: OrdersController;

  const verifiedCustomer: CurrentCustomerData = {
    customerId: 'customer-1',
    email: 'jane@example.com',
    emailVerified: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new OrdersController(
      ordersService as never,
      paymentsService as never,
    );
    ordersService.create.mockResolvedValue({
      id: 'order-1',
      order_number: 'SF-2026-000001',
      total_paise: 125000,
    });
    paymentsService.createForOrder.mockResolvedValue({
      key: 'rzp_test_key',
      razorpayOrderId: 'order_rzp_1',
      amountPaise: 125000,
      currency: 'INR',
      orderNumber: 'SF-2026-000001',
    });
  });

  it('rejects order placement for an unverified customer before reserving stock', async () => {
    const unverifiedCustomer = { ...verifiedCustomer, emailVerified: false };

    await expect(
      controller.create(unverifiedCustomer, { addressId: 'address-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(ordersService.create).not.toHaveBeenCalled();
    expect(paymentsService.createForOrder).not.toHaveBeenCalled();
  });

  it('creates the order and payment for a verified customer', async () => {
    await expect(
      controller.create(verifiedCustomer, { addressId: 'address-1' }),
    ).resolves.toHaveProperty('order.order_number', 'SF-2026-000001');
    await expect(
      controller.create(verifiedCustomer, { addressId: 'address-1' }),
    ).resolves.toHaveProperty('payment.razorpayOrderId', 'order_rzp_1');

    expect(ordersService.create).toHaveBeenCalledWith(verifiedCustomer, {
      addressId: 'address-1',
    });
    expect(paymentsService.createForOrder).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1' }),
    );
  });
});
