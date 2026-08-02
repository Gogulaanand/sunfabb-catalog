import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller.js';
import { CheckoutService } from './checkout.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { StorefrontModeGuard } from '../config/storefront-mode.guard.js';

@Module({
  imports: [PrismaModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, StorefrontModeGuard],
})
export class CheckoutModule {}
