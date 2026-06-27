import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CurrentCustomerData } from '../strategies/customer-jwt.strategy.js';

// Pulls the authenticated customer ({ customerId, email }) off the request,
// as populated by CustomerJwtStrategy.validate(). Only meaningful behind
// CustomerJwtAuthGuard.
export const CurrentCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentCustomerData => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: CurrentCustomerData }>();
    return request.user;
  },
);
