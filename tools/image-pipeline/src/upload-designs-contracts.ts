import { z } from 'zod';
import { normalize, skuFor, type DesignInput, type ExpectedImage } from './upload-designs-input.js';
import { ApiContractError } from './upload-designs-errors.js';
import type { ProductType, ReleaseMetadata } from './types.js';

export const LookupSchema = z
  .object({ id: z.string().min(1), name: z.string().min(1) })
  .passthrough();
export const MutationSchema = z.object({ id: z.string().min(1) }).passthrough();
const AdminVariantSchema = z
  .object({
    id: z.string().min(1),
    sku: z.string().min(1),
    is_active: z.boolean(),
    color_id: z.string().nullable().optional(),
    material_id: z.string().nullable().optional(),
    size: z.string().nullable().optional(),
    price: z.number().int().optional(),
    stock_quantity: z.number().int().optional(),
  })
  .passthrough();
const AdminImageSchema = z
  .object({
    id: z.string().min(1),
    public_id: z.string().min(1).nullable().optional(),
    url: z.string().min(1),
    variant_id: z.string().nullable().optional(),
    image_role: z.string().nullable().optional(),
    sort_order: z.number().int().optional(),
    is_primary: z.boolean(),
  })
  .passthrough();

export const AdminProductSchema = z
  .object({
    name: z.string(),
    id: z.string().min(1),
    slug: z.string().min(1),
    is_active: z.boolean(),
    description: z.string().nullable(),
    care_instructions: z.string().nullable(),
    measured_width_cm: z.number().positive().nullable(),
    measured_length_cm: z.number().positive().nullable(),
    set_contents: z.string().nullable(),
    /** A null timestamp identifies a draft; a value identifies a product that may be restored. */
    published_at: z.string().datetime({ offset: true }).nullable(),
    variants: z.array(AdminVariantSchema),
    images: z.array(AdminImageSchema),
  })
  .passthrough();

export type AdminProduct = z.infer<typeof AdminProductSchema>;
export type Lookup = z.infer<typeof LookupSchema>;
export type AdminProductLookup =
  | { kind: 'missing' }
  | { kind: 'found'; product: AdminProduct };

const VariantExpectedSchema = z.object({
  color: z.string().min(1),
  sku: z.string().min(1),
  colorId: z.string().min(1),
  materialId: z.string().min(1),
  size: z.string().min(1),
  price: z.number().int().positive(),
  stock: z.number().int().min(0),
});
export type ExpectedVariant = z.infer<typeof VariantExpectedSchema>;

export function expectedVariants(
  design: DesignInput,
  productType: Exclude<ProductType, 'unknown'>,
  designNo: string,
  release: ReleaseMetadata,
  material: Lookup,
  colors: Map<string, Lookup>,
): ExpectedVariant[] {
  return design.colorways.map((colorway) => {
    const color = colors.get(normalize(colorway.color));
    if (!color) {
      throw new Error(`colour ${colorway.color} still missing after creation step`);
    }
    return VariantExpectedSchema.parse({
      color: colorway.color,
      sku: skuFor(productType, designNo, colorway.color),
      colorId: color.id,
      materialId: material.id,
      size: release.variantSize,
      price: release.pricePaise,
      stock: release.stockQuantity,
    });
  });
}

function setContentsText(release: ReleaseMetadata): string {
  const contents = release.setContents;
  if (!contents) throw new ApiContractError('set contents are required');
  const pieces = contents.pieces.join(', ');
  return `${pieces}; pillow cover count: ${contents.pillowCoverCount}`;
}

export function explicitProductBody(
  slug: string,
  categoryId: string,
  release: ReleaseMetadata,
): Record<string, unknown> {
  return {
    name: release.commercialName,
    slug,
    category_id: categoryId,
    description: release.description,
    care_instructions: release.careInstructions,
    measured_width_cm: release.measuredWidthCm,
    measured_length_cm: release.measuredLengthCm,
    set_contents: setContentsText(release),
  };
}

const INTERNAL_COPY_PATTERN =
  /\b(?:admin(?:\s+catalog)?|internal|placeholder|refine|tbd|todo)\b/i;

export function isCustomerSafeDescription(description: string | null): boolean {
  const trimmed = description?.trim();
  if (!trimmed) return false;
  return !INTERNAL_COPY_PATTERN.test(trimmed);
}

function releaseFactsMatch(
  product: AdminProduct,
  release: ReleaseMetadata,
): boolean {
  return (
    product.name === release.commercialName &&
    product.description === release.description &&
    product.care_instructions === release.careInstructions &&
    product.measured_width_cm === release.measuredWidthCm &&
    product.measured_length_cm === release.measuredLengthCm &&
    product.set_contents === setContentsText(release)
  );
}

function variantMatchesExpected(
  found: AdminProduct['variants'][number],
  expected: ExpectedVariant,
): boolean {
  return (
    found.color_id === expected.colorId &&
    found.material_id === expected.materialId &&
    found.size === expected.size &&
    found.price === expected.price &&
    found.stock_quantity === expected.stock
  );
}

export function productIsComplete(
  product: AdminProduct,
  variants: ExpectedVariant[],
  images: ExpectedImage[],
  release: ReleaseMetadata,
): boolean {
  if (!isCustomerSafeDescription(product.description)) return false;
  if (!releaseFactsMatch(product, release)) return false;

  const bySku = new Map<string, AdminProduct['variants'][number]>();
  for (const variant of product.variants) {
    if (bySku.has(variant.sku)) return false;
    bySku.set(variant.sku, variant);
  }
  if (
    variants.some((expected) => {
      const found = bySku.get(expected.sku);
      return !found || !found.is_active || !variantMatchesExpected(found, expected);
    })
  ) {
    return false;
  }

  const variantIdByColor = new Map(
    variants.map((expected) => [expected.color, bySku.get(expected.sku)?.id]),
  );
  const byPublicId = new Map<string, AdminProduct['images'][number]>();
  for (const image of product.images) {
    if (!image.public_id) continue;
    if (byPublicId.has(image.public_id)) return false;
    byPublicId.set(image.public_id, image);
  }
  if (
    images.some((expected) => {
      const found = byPublicId.get(expected.publicId);
      return (
        !found ||
        found.image_role !== 'GALLERY' ||
        found.sort_order !== expected.order ||
        found.is_primary !== expected.primary ||
        found.variant_id !== variantIdByColor.get(expected.color)
      );
    })
  ) {
    return false;
  }
  const galleryPrimaries = product.images.filter(
    (image) => image.image_role === 'GALLERY' && image.is_primary,
  );
  return (
    galleryPrimaries.length === 1 &&
    images.some(
      (expected) =>
        expected.primary &&
        byPublicId.get(expected.publicId)?.is_primary === true,
    )
  );
}
