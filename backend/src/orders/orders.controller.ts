import {
  Body,
  ForbiddenException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { OrdersService } from './orders.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { ListOrdersDto } from './dto/list-orders.dto.js';
import { CustomerJwtAuthGuard } from '../customer-auth/guards/customer-jwt-auth.guard.js';
import { CurrentCustomer } from '../customer-auth/decorators/current-customer.decorator.js';
import type { CurrentCustomerData } from '../customer-auth/strategies/customer-jwt.strategy.js';

@Controller()
@UseGuards(CustomerJwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // Places the order (stock reserved, snapshots frozen — 6.3) then creates the
  // matching Razorpay order for the server-computed total (never a client amount,
  // D34 / §7.1) and returns the params the hosted Checkout needs. Rate limited
  // (§7.2) — order creation reserves stock, so it must not be freely spammable.
  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  async create(
    @CurrentCustomer() customer: CurrentCustomerData,
    @Body() dto: CreateOrderDto,
  ) {
    if (!customer.emailVerified) {
      throw new ForbiddenException(
        'Email verification required before placing an order',
      );
    }
    const order = await this.ordersService.create(customer, dto);
    const payment = await this.paymentsService.createForOrder(order);
    return { order, payment };
  }

  @Get('me/orders')
  findAll(
    @CurrentCustomer() customer: CurrentCustomerData,
    @Query() query: ListOrdersDto,
  ) {
    return this.ordersService.findAll(customer.customerId, query);
  }

  @Get('me/orders/:orderNumber')
  findOne(
    @CurrentCustomer() customer: CurrentCustomerData,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.ordersService.findOneByNumber(customer.customerId, orderNumber);
  }
}
