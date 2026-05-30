import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { CategoriesModule } from './categories/categories.module.js';

@Module({
  imports: [PrismaModule, CategoriesModule],
})
export class AppModule {}
