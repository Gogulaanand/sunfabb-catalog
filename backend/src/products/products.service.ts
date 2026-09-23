import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FindProductsDto } from './dto/find-products.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { CreateVariantDto } from './dto/create-variant.dto.js';
import { CreateProductImageDto } from './dto/create-product-image.dto.js';
import { ProductImageRole } from '../../generated/prisma/enums.js';

// These phrases are operator notes rather than customer-facing product copy.
// Keeping the guard small and explicit prevents the known uploader placeholder
// (for example, “refine in admin catalog”) from being published accidentally.
const INTERNAL_COPY_PATTERN =
  /\b(?:admin(?:\s+catalog)?|internal|placeholder|refine|tbd|todo)\b/i;

function isCustomerSafeDescription(description: string | null): boolean {
  const trimmed = description?.trim();
  if (!trimmed) return false;
  return !INTERNAL_COPY_PATTERN.test(trimmed);
}

function hasText(value: string | null): boolean {
  return Boolean(value?.trim());
}

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

  /**
   * Admin detail is deliberately separate from the public lookup. The admin
   * must be able to repair drafts, hidden products, and inactive variants;
   * customer-facing detail must continue to fail closed on inactive rows.
   */
  findOneAdmin(slug: string) {
    return this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: { select: { name: true, slug: true } },
        variants: {
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
    // Keep the draft invariant explicit in the write path as well as in the
    // database default. This protects the workflow if a caller later passes
    // a DTO assembled outside the normal form flow.
    return this.prisma.product.create({
      data: { ...dto, is_active: false },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const rawDto = dto as unknown as Record<string, unknown>;
    if ('is_active' in rawDto || 'published_at' in rawDto) {
      throw new BadRequestException(
        'Product lifecycle state must be changed through publish, restore, or hide endpoints.',
      );
    }

    const releaseFactFields = [
      'description',
      'care_instructions',
      'measured_width_cm',
      'measured_length_cm',
      'set_contents',
    ];
    if (!releaseFactFields.some((field) => field in rawDto)) {
      return this.prisma.product.update({ where: { id }, data: dto });
    }

    return this.prisma.$transaction(async (tx) => {
      // Serialize release-fact edits with publish/restore. Draft facts may be
      // incomplete, but a published product must retain every verified fact.
      await tx.product.update({
        where: { id },
        data: { updated_at: new Date() },
        select: { id: true },
      });
      const product = await tx.product.findUnique({
        where: { id },
        select: {
          is_active: true,
          description: true,
          care_instructions: true,
          measured_width_cm: true,
          measured_length_cm: true,
          set_contents: true,
        },
      });
      const next = product
        ? {
            description:
              'description' in rawDto
                ? (dto.description ?? null)
                : product.description,
            care_instructions:
              'care_instructions' in rawDto
                ? (dto.care_instructions ?? null)
                : product.care_instructions,
            measured_width_cm:
              'measured_width_cm' in rawDto
                ? (dto.measured_width_cm ?? null)
                : product.measured_width_cm,
            measured_length_cm:
              'measured_length_cm' in rawDto
                ? (dto.measured_length_cm ?? null)
                : product.measured_length_cm,
            set_contents:
              'set_contents' in rawDto
                ? (dto.set_contents ?? null)
                : product.set_contents,
          }
        : null;
      if (
        product?.is_active &&
        next &&
        (!isCustomerSafeDescription(next.description) ||
          !hasText(next.care_instructions) ||
          next.measured_width_cm === null ||
          next.measured_length_cm === null ||
          !hasText(next.set_contents))
      ) {
        throw new BadRequestException(
          'Hide the product before clearing required customer release facts.',
        );
      }
      return tx.product.update({ where: { id }, data: dto });
    });
  }

  remove(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { is_active: false },
    });
  }

  publish(id: string) {
    return this.setPublished(id, 'publish');
  }

  restore(id: string) {
    return this.setPublished(id, 'restore');
  }

  /**
   * Publish and restore intentionally share this rule. A product is only
   * customer-visible when its copy, purchasable variant, and cover image are
   * present and usable.
   */
  private async setPublished(id: string, action: 'publish' | 'restore') {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException(`Product '${id}' not found`);

      // Cover mutations take this same parent-row lock. Read completeness
      // after acquiring it so a draft's last cover cannot disappear between
      // validation and publication.
      await tx.product.update({
        where: { id },
        data: { updated_at: new Date() },
        select: { id: true },
      });

      const product = await tx.product.findUnique({
        where: { id },
        select: {
          id: true,
          description: true,
          care_instructions: true,
          measured_width_cm: true,
          measured_length_cm: true,
          set_contents: true,
          published_at: true,
          variants: {
            where: { is_active: true },
            select: {
              price: true,
              stock_quantity: true,
              material_id: true,
            },
          },
          images: {
            where: {
              is_primary: true,
              image_role: ProductImageRole.GALLERY,
            },
            select: { id: true },
            take: 1,
          },
        },
      });
      if (!product) throw new NotFoundException(`Product '${id}' not found`);

      if (action === 'restore' && product.published_at === null) {
        throw new BadRequestException(
          'Product cannot be restored because it has not been published yet.',
        );
      }

      const reasons: string[] = [];
      if (!isCustomerSafeDescription(product.description)) {
        reasons.push('a customer-safe description');
      }
      if (!hasText(product.care_instructions)) {
        reasons.push('care instructions');
      }
      if (
        product.measured_width_cm === null ||
        product.measured_length_cm === null
      ) {
        reasons.push('measured width and length in centimetres');
      }
      if (!hasText(product.set_contents)) {
        reasons.push('set contents');
      }
      if (
        !product.variants.some(
          (variant) =>
            variant.price > 0 &&
            variant.stock_quantity > 0 &&
            Boolean(variant.material_id),
        )
      ) {
        reasons.push(
          'an active variant with a positive price and stock quantity',
        );
      }
      if (product.images.length === 0) {
        reasons.push('a primary gallery image');
      }

      if (reasons.length > 0) {
        throw new BadRequestException(
          `Product cannot be published: add ${reasons.join(', ')}.`,
        );
      }

      return tx.product.update({
        where: { id },
        data: {
          is_active: true,
          ...(product.published_at === null
            ? { published_at: new Date() }
            : {}),
        },
      });
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

    const data = { ...dto, product_id: productId };
    const requestsGalleryPrimary =
      dto.is_primary === true &&
      (dto.image_role === undefined ||
        dto.image_role === ProductImageRole.GALLERY);

    if (!requestsGalleryPrimary) {
      return this.prisma.productImage.create({ data });
    }

    // A cover replacement must clear the previous cover and create the new
    // one in the same transaction. Otherwise the short gap between two
    // independent writes can leave multiple gallery primaries behind.
    return this.prisma.$transaction(async (tx) => {
      // Updating the parent row acquires its write lock. Every endpoint that
      // changes a product's cover takes this same lock before touching image
      // primaries, so add-image and make-cover cannot interleave their reset
      // and set operations.
      await tx.product.update({
        where: { id: productId },
        data: { updated_at: new Date() },
        select: { id: true },
      });

      await tx.productImage.updateMany({
        where: {
          product_id: productId,
          image_role: ProductImageRole.GALLERY,
        },
        data: { is_primary: false },
      });

      return tx.productImage.create({ data });
    });
  }
}
