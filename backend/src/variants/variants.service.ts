import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateVariantDto } from './dto/update-variant.dto.js';

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  update(id: string, dto: UpdateVariantDto) {
    return this.updateWithPublishedProductProtection(id, dto);
  }

  remove(id: string) {
    return this.updateWithPublishedProductProtection(id, { is_active: false });
  }

  /**
   * A published product must always retain one sellable variant. The product
   * row is the shared lock used by publication and image lifecycle writes, so
   * an admin variant edit cannot validate against a stale product state while
   * a concurrent publish is completing.
   */
  private async updateWithPublishedProductProtection(
    id: string,
    data: UpdateVariantDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.productVariant.findUnique({
        where: { id },
        select: { product_id: true },
      });
      if (!existing) throw new NotFoundException(`Variant '${id}' not found`);

      const product = await tx.product.update({
        where: { id: existing.product_id },
        data: { updated_at: new Date() },
        select: { is_active: true },
      });

      // Re-read after taking the parent lock. Another variant write uses the
      // same lock and may have committed after the initial lookup.
      const current = await tx.productVariant.findUnique({
        where: { id },
        select: {
          product_id: true,
          is_active: true,
          price: true,
          stock_quantity: true,
        },
      });
      if (!current) throw new NotFoundException(`Variant '${id}' not found`);

      const willRemainSellable =
        (data.is_active ?? current.is_active) &&
        (data.price ?? current.price) > 0 &&
        (data.stock_quantity ?? current.stock_quantity) > 0;

      if (product.is_active && !willRemainSellable) {
        const alternativeCount = await tx.productVariant.count({
          where: {
            product_id: current.product_id,
            id: { not: id },
            is_active: true,
            price: { gt: 0 },
            stock_quantity: { gt: 0 },
          },
        });

        if (alternativeCount === 0) {
          throw new BadRequestException(
            'Cannot make the only sellable variant unavailable while its product is published; keep another active variant with a positive price and stock quantity',
          );
        }
      }

      return tx.productVariant.update({ where: { id }, data });
    });
  }
}
