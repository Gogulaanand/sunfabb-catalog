import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { MaterialsModule } from './materials/materials.module.js';
import { ColorsModule } from './colors/colors.module.js';
import { ProductsModule } from './products/products.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AdminImagesModule } from './admin/images/admin-images.module.js';

@Module({
  imports: [
    PrismaModule,
    CategoriesModule,
    MaterialsModule,
    ColorsModule,
    ProductsModule,
    AuthModule,
    AdminImagesModule,
  ],
})
export class AppModule {}
