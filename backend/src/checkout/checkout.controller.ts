import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CheckoutService } from './checkout.service.js';
import { CustomerJwtAuthGuard } from '../customer-auth/guards/customer-jwt-auth.guard.js';
import { CurrentCustomer } from '../customer-auth/decorators/current-customer.decorator.js';
import type { CurrentCustomerData } from '../customer-auth/strategies/customer-jwt.strategy.js';

@Controller('checkout')
@UseGuards(CustomerJwtAuthGuard)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  // POST (not GET) — recomputing a quote is a deliberate, non-cacheable action
  // priced from the live cart; it takes no body (the cart is read from the token).
  @Post('quote')
  @HttpCode(HttpStatus.OK)
  quote(@CurrentCustomer() customer: CurrentCustomerData) {
    return this.checkoutService.quote(customer.customerId);
  }
}
