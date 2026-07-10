import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { OrderExpiryService } from './order-expiry.service.js';

// POST /admin/expiry/orders — triggers the same expiry logic as the hourly cron
// immediately. Useful in staging to force a sweep without waiting an hour.
// Admin-JWT-guarded, same pattern as other admin controllers.
@Controller('admin/expiry/orders')
@UseGuards(JwtAuthGuard)
export class OrderExpiryController {
  constructor(private readonly orderExpiry: OrderExpiryService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async expire(): Promise<{ expired: number }> {
    const expired = await this.orderExpiry.expireNow();
    return { expired };
  }
}
