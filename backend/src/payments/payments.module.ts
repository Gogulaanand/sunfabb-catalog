import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EmailModule } from '../email/email.module.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { RazorpayService } from './razorpay.service.js';

// Exports PaymentsService + RazorpayService so OrdersModule (POST /orders wiring)
// and WebhooksModule (source-of-truth confirmation) can reuse them without a
// circular import — payments never depends back on orders/webhooks; it drives
// order status directly via Prisma conditional updates.
@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, RazorpayService],
  exports: [PaymentsService, RazorpayService],
})
export class PaymentsModule {}
