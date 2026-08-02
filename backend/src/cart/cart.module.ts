import { Module } from '@nestjs/common';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { StorefrontModeGuard } from '../config/storefront-mode.guard.js';

@Module({
  imports: [PrismaModule],
  controllers: [CartController],
  providers: [CartService, StorefrontModeGuard],
})
export class CartModule {}
