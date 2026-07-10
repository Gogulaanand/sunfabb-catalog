import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { ListOrdersDto } from './dto/list-orders.dto.js';
import { CustomerJwtAuthGuard } from '../customer-auth/guards/customer-jwt-auth.guard.js';
import { CurrentCustomer } from '../customer-auth/decorators/current-customer.decorator.js';
import type { CurrentCustomerData } from '../customer-auth/strategies/customer-jwt.strategy.js';

@Controller()
@UseGuards(CustomerJwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentCustomer() customer: CurrentCustomerData,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(customer, dto);
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
