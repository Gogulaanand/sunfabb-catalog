import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PaymentsService } from './payments.service.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { CustomerJwtAuthGuard } from '../customer-auth/guards/customer-jwt-auth.guard.js';
import { CurrentCustomer } from '../customer-auth/decorators/current-customer.decorator.js';
import type { CurrentCustomerData } from '../customer-auth/strategies/customer-jwt.strategy.js';

@Controller()
@UseGuards(CustomerJwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Optimistic client confirmation after the hosted Checkout succeeds. Rate
  // limited (§7.2) so a leaked token can't be used to brute-probe signatures.
  @Post('payments/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  verify(
    @CurrentCustomer() customer: CurrentCustomerData,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyCallback(customer, dto);
  }
}
