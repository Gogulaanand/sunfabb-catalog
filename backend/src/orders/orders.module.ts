import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PaymentsModule } from '../payments/payments.module.js';

@Module({
  imports: [PrismaModule, PaymentsModule], // PaymentsService wires the Razorpay order onto POST /orders (6.4)
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService], // admin orders (6.8) reuse transition()
})
export class OrdersModule {}
