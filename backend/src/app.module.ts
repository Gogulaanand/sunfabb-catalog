import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { MaterialsModule } from './materials/materials.module.js';
import { ColorsModule } from './colors/colors.module.js';
import { ProductsModule } from './products/products.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AdminImagesModule } from './admin/images/admin-images.module.js';
import { VariantsModule } from './variants/variants.module.js';
import { ImagesModule } from './images/images.module.js';
import { EmailModule } from './email/email.module.js';
import { CustomerAuthModule } from './customer-auth/customer-auth.module.js';
import { AddressesModule } from './addresses/addresses.module.js';
import { CartModule } from './cart/cart.module.js';
import { CheckoutModule } from './checkout/checkout.module.js';
import { OrdersModule } from './orders/orders.module.js';

@Module({
  imports: [
    // Throttler config for routes that opt in via @UseGuards(ThrottlerGuard);
    // not registered as a global guard, so existing endpoints are unaffected.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    EmailModule,
    CategoriesModule,
    MaterialsModule,
    ColorsModule,
    ProductsModule,
    AuthModule,
    AdminImagesModule,
    VariantsModule,
    ImagesModule,
    CustomerAuthModule,
    AddressesModule,
    CartModule,
    CheckoutModule,
    OrdersModule,
  ],
})
export class AppModule {}
