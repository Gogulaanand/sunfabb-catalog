import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FindProductsDto } from './dto/find-products.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: FindProductsDto) {
    const {
      categorySlug,
      materialId,
      colorId,
      sortBy = 'name',
      page = 1,
      limit = 20,
    } = dto;

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

    const include = {
      category: { select: { name: true, slug: true } },
      images: { where: { is_primary: true }, take: 1 },
      variants: {
        where: { is_active: true },
        select: { price: true },
        orderBy: { price: 'asc' as const },
        take: 1,
      },
    };

    // Prisma's generated types don't support ordering a to-many relation by
    // _min/_max of a scalar field, only _count — so price sort is done in
    // application code. The catalog is small (<=100 products), so this is fine.
    if (sortBy === 'price_asc' || sortBy === 'price_desc') {
      const all = await this.prisma.product.findMany({ where, include });
      all.sort((a, b) => {
        const priceA = a.variants[0]?.price ?? 0;
        const priceB = b.variants[0]?.price ?? 0;
        return sortBy === 'price_asc' ? priceA - priceB : priceB - priceA;
      });

      const total = all.length;
      const skip = (page - 1) * limit;
      return { items: all.slice(skip, skip + limit), total, page, limit };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include,
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
