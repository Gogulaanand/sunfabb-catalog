import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FindProductsDto } from './dto/find-products.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { CreateVariantDto } from './dto/create-variant.dto.js';
import { CreateProductImageDto } from './dto/create-product-image.dto.js';
import { ProductImageRole } from '../../generated/prisma/enums.js';

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

    // When a colour filter is on, the card must show that colour's photo. The
    // default primary image is whichever colourway was uploaded first, so
    // without this a "green" search returns the right products wearing their
    // blue photo — which reads to a shopper as a filter that did nothing.
    // Pull the matching colourway's image alongside the primary and pick
    // between them below, so a product with no photo for that colour still
    // falls back to the primary rather than rendering an empty card.
    const include = {
      category: { select: { name: true, slug: true } },
      images: {
        where: colorId
          ? {
              image_role: ProductImageRole.GALLERY,
              OR: [{ variant: { color_id: colorId } }, { is_primary: true }],
            }
          : {
              is_primary: true,
              image_role: ProductImageRole.GALLERY,
            },
        orderBy: { sort_order: 'asc' as const },
        ...(colorId ? {} : { take: 1 }),
        include: { variant: { select: { color_id: true } } },
      },
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
      return {
        items: this.pickCardImages(all.slice(skip, skip + limit), colorId),
        total,
        page,
        limit,
      };
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

    return { items: this.pickCardImages(items, colorId), total, page, limit };
  }

  /**
   * Narrows each product's `images` down to the single image its catalog card
   * should show: the filtered colour's photo when there is one, otherwise the
   * primary. Returns one image per product either way, so the list response
   * shape does not change between filtered and unfiltered requests.
   */
  private pickCardImages<
    T extends {
      images: { is_primary: boolean; variant: { color_id: string } | null }[];
    },
  >(products: T[], colorId?: string): T[] {
    if (!colorId) return products;

    return products.map((product) => {
      const forColor = product.images.find(
        (image) => image.variant?.color_id === colorId,
      );
      const chosen =
        forColor ?? product.images.find((image) => image.is_primary);

      return { ...product, images: chosen ? [chosen] : [] };
    });
  }

  async findAllAdmin(dto: FindProductsDto) {
    const { categorySlug, sortBy = 'name', page = 1, limit = 20 } = dto;

    const where: Record<string, unknown> = {};
    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    const include = {
      category: { select: { name: true, slug: true } },
      images: {
        where: {
          is_primary: true,
          image_role: ProductImageRole.GALLERY,
        },
        take: 1,
      },
      variants: {
        select: { price: true },
        orderBy: { price: 'asc' as const },
        take: 1,
      },
      // Total image count for the admin SEO-completeness badge. The `images`
      // relation above is narrowed to the single primary image for the
      // thumbnail, so it cannot be counted for this purpose.
      _count: { select: { images: true } },
    };

    if (sortBy === 'price_asc' || sortBy === 'price_desc') {
      const all = await this.prisma.product.findMany({ where, include });
      all.sort((a, b) => {
        const priceA = a.variants[0]?.price ?? 0;
        const priceB = b.variants[0]?.price ?? 0;
        return sortBy === 'price_asc' ? priceA - priceB : priceB - priceA;
      });

      const total = all.length;
      const skip = (page - 1) * limit;
      const items = await this.withMissingAltTextCounts(
        all.slice(skip, skip + limit),
      );
      return { items, total, page, limit };
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

    return {
      items: await this.withMissingAltTextCounts(items),
      total,
      page,
      limit,
    };
  }

  /**
   * Annotates admin product rows with how many of their images have no alt
   * text, for the SEO-completeness badge in the admin product list.
   *
   * This is a single grouped query for the whole page rather than one per
   * product. It cannot be folded into the `_count` on the main query, because
   * Prisma keys relation counts by relation name — `images` can be counted
   * once, filtered or unfiltered, but not both.
   */
  private async withMissingAltTextCounts<T extends { id: string }>(
    products: T[],
  ): Promise<(T & { images_missing_alt_text: number })[]> {
    if (products.length === 0) return [];

    const grouped = await this.prisma.productImage.groupBy({
      by: ['product_id'],
      where: {
        product_id: { in: products.map((product) => product.id) },
        // Empty string counts as missing: the admin form submits "" when the
        // field is cleared, so alt text ends up absent but not null.
        OR: [{ alt_text: null }, { alt_text: '' }],
      },
      _count: { _all: true },
    });

    const missingByProduct = new Map(
      grouped.map((row) => [row.product_id, row._count._all]),
    );

    return products.map((product) => ({
      ...product,
      images_missing_alt_text: missingByProduct.get(product.id) ?? 0,
    }));
  }

  findOne(slug: string) {
    return this.prisma.product.findUnique({
      where: { slug, is_active: true },
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

  create(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  update(id: string, dto: UpdateProductDto) {
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { is_active: false },
    });
  }

  addVariant(productId: string, dto: CreateVariantDto) {
    return this.prisma.productVariant.create({
      data: { ...dto, product_id: productId },
    });
  }

  addImage(productId: string, dto: CreateProductImageDto) {
    return this.createImageAfterVariantCheck(productId, dto);
  }

  private async createImageAfterVariantCheck(
    productId: string,
    dto: CreateProductImageDto,
  ) {
    if (dto.image_role === ProductImageRole.SWATCH) {
      if (!dto.variant_id) {
        throw new BadRequestException(
          'A swatch image must be associated with a variant',
        );
      }

      if (dto.is_primary) {
        throw new BadRequestException(
          'A swatch image cannot be a primary product image',
        );
      }
    }

    if (dto.variant_id) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: dto.variant_id },
        select: { product_id: true },
      });

      if (!variant) {
        throw new BadRequestException(
          `Variant '${dto.variant_id}' was not found`,
        );
      }

      if (variant.product_id !== productId) {
        throw new BadRequestException(
          `Variant '${dto.variant_id}' does not belong to product '${productId}'`,
        );
      }
    }

    return this.prisma.productImage.create({
      data: { ...dto, product_id: productId },
    });
  }
}
