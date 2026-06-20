import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateVariantDto } from './dto/update-variant.dto.js';

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  update(id: string, dto: UpdateVariantDto) {
    return this.prisma.productVariant.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.productVariant.update({
      where: { id },
      data: { is_active: false },
    });
  }
}
