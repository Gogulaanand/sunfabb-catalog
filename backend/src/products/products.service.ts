import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FindProductsDto } from './dto/find-products.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: FindProductsDto) {
    const { categorySlug, materialId, colorId, sortBy = 'name', page = 1, limit = 20 } = dto;

    const where: Record<string, unknown> = { is_active: true };

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    if (materialId || colorId) {
      const variantFilter: Record<string, unknown> = { is_active: true };
      if (materialId) variantFilter.material_id = materialId;
      if (colorId) variantFilter.color_id = colorId;
      where.variants = { some: variantFilter };
    }

    const orderBy =
      sortBy === 'price_asc'
        ? { variants: { _min: { price: 'asc' as const } } }
        : sortBy === 'price_desc'
          ? { variants: { _min: { price: 'desc' as const } } }
          : { name: 'asc' as const };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: { select: { name: true, slug: true } },
          images: { where: { is_primary: true }, take: 1 },
          variants: {
            where: { is_active: true },
            select: { price: true },
            orderBy: { price: 'asc' },
            take: 1,
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  findOne(slug: string) {
    return this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: { select: { name: true, slug: true } },
        variants: {
          where: { is_active: true },
          include: {
            material: { select: { name: true } },
            color: { select: { name: true, hex_code: true } },
          },
        },
        images: { orderBy: { sort_order: 'asc' } },
      },
    });
  }
}
