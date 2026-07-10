import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { OrderExpiryService } from './order-expiry.service.js';
import { OrderExpiryController } from './order-expiry.controller.js';

@Module({
  imports: [PrismaModule, PaymentsModule],
  providers: [OrderExpiryService],
  controllers: [OrderExpiryController],
})
export class OrderExpiryModule {}
