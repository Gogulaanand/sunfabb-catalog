import { Api } from './upload-designs-api.js';
import {
  explicitProductBody,
  isCustomerSafeDescription,
  MutationSchema,
  productIsComplete,
  type AdminProduct,
  type AdminProductLookup,
  type ExpectedVariant,
} from './upload-designs-contracts.js';
import { ApiContractError } from './upload-designs-errors.js';
import type { ExpectedImage } from './upload-designs-input.js';
import type { ReleaseMetadata } from './types.js';

function assertCustomerSafeDescription(
  product: AdminProduct,
  slug: string,
): void {
  if (!isCustomerSafeDescription(product.description)) {
    throw new ApiContractError(
      `product ${slug} has internal or missing customer copy; refusing repair/publication until owner-approved description is recorded`,
    );
  }
}

function assertVariantCompatible(
  found: AdminProduct['variants'][number],
  expected: ExpectedVariant,
): void {
  if (!found.is_active) {
    throw new ApiContractError(
      `variant ${expected.sku} exists but is inactive; no variant activation contract is available`,
    );
  }
  const mismatches: string[] = [];
  if (found.color_id !== expected.colorId) mismatches.push('color');
  if (found.material_id !== expected.materialId) mismatches.push('material');
  if (found.size !== expected.size) mismatches.push('size');
  if (found.price !== expected.price) mismatches.push('price');
  if (found.stock_quantity !== expected.stock) mismatches.push('stock');
  if (mismatches.length) {
    throw new ApiContractError(
      `existing variant ${expected.sku} differs in ${mismatches.join(', ')}; no variant update contract is available`,
    );
  }
}

async function reconcileVariants(
  api: Api,
  product: AdminProduct,
  expected: ExpectedVariant[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const bySku = new Map<string, AdminProduct['variants'][number]>();
  for (const variant of product.variants) {
    if (bySku.has(variant.sku)) {
      throw new ApiContractError(
        `duplicate existing SKU ${variant.sku} on product ${product.id}`,
      );
    }
    bySku.set(variant.sku, variant);
  }
  for (const variant of expected) {
    const existing = bySku.get(variant.sku);
    if (existing) {
      assertVariantCompatible(existing, variant);
      result.set(variant.color, existing.id);
      continue;
    }
    const created = await api.post(
      `/products/${product.id}/variants`,
      {
        color_id: variant.colorId,
        material_id: variant.materialId,
        size: variant.size,
        price: variant.price,
        stock_quantity: variant.stock,
        sku: variant.sku,
      },
      MutationSchema,
    );
    result.set(variant.color, created.id);
  }
  return result;
}

async function reconcileImages(
  api: Api,
  product: AdminProduct,
  uploaded: ExpectedImage[],
  urls: Map<string, string>,
  variantIds: Map<string, string>,
): Promise<void> {
  const byPublicId = new Map<string, AdminProduct['images'][number]>();
  for (const image of product.images) {
    if (!image.public_id) continue;
    if (byPublicId.has(image.public_id)) {
      throw new ApiContractError(
        `duplicate existing public_id ${image.public_id} on product ${product.id}`,
      );
    }
    byPublicId.set(image.public_id, image);
  }
  for (const image of uploaded) {
    const variantId = variantIds.get(image.color);
    if (!variantId) {
      throw new ApiContractError(`missing variant id for ${image.color}`);
    }
    const existing = byPublicId.get(image.publicId);
    if (existing) {
      if (existing.image_role !== 'GALLERY') {
        throw new ApiContractError(
          `existing ${image.publicId} is not a gallery image`,
        );
      }
      if (existing.variant_id !== variantId) {
        throw new ApiContractError(
          `existing ${image.publicId} is attached to a different variant`,
        );
      }
      if (existing.sort_order !== image.order) {
        throw new ApiContractError(
          `existing ${image.publicId} has the wrong gallery order`,
        );
      }
      if (existing.is_primary !== image.primary) {
        throw new ApiContractError(
          `existing ${image.publicId} has the wrong primary flag`,
        );
      }
      continue;
    }
    const url = urls.get(image.publicId);
    if (!url) {
      throw new ApiContractError(
        `missing Cloudinary URL for ${image.publicId}`,
      );
    }
    await api.post(
      `/products/${product.id}/images`,
      {
        url,
        public_id: image.publicId,
        variant_id: variantId,
        image_role: 'GALLERY',
        sort_order: image.order,
        is_primary: image.primary,
        alt_text: `${image.color.replace(/-/g, ' ')} ${image.scene}`,
      },
      MutationSchema,
    );
  }
}

export interface ReconcileProductArgs {
  api: Api;
  existing: AdminProductLookup;
  slug: string;
  categoryId: string;
  release: ReleaseMetadata;
  variants: ExpectedVariant[];
  images: ExpectedImage[];
  urls: Map<string, string>;
}

export interface ReconcileProductResult {
  productId: string;
  status: 'already-complete' | 'published';
  images: number;
}

function visibilityMutationPath(product: AdminProduct): '/publish' | '/restore' {
  return product.published_at === null ? '/publish' : '/restore';
}

/** Reconcile one product using stable SKU/public-id identities. */
export async function reconcileProduct({
  api,
  existing,
  slug,
  categoryId,
  release,
  variants,
  images,
  urls,
}: ReconcileProductArgs): Promise<ReconcileProductResult> {
  let product: AdminProduct;
  if (existing.kind === 'found') {
    product = existing.product;
    if (product.slug !== slug) {
      throw new ApiContractError(`admin product slug mismatch for ${slug}`);
    }
    if (
      product.is_active &&
      productIsComplete(product, variants, images, release)
    ) {
      return {
        productId: product.id,
        status: 'already-complete',
        images: images.length,
      };
    }
    if (
      !product.is_active &&
      productIsComplete(product, variants, images, release)
    ) {
      await api.patch(
        `/products/${product.id}${visibilityMutationPath(product)}`,
        {},
        MutationSchema,
      );
      const published = await api.getAdminProduct(slug);
      if (
        published.kind === 'missing' ||
        !published.product.is_active ||
        !productIsComplete(published.product, variants, images, release)
      ) {
        throw new ApiContractError(
          `publish contract did not return a complete active product for ${slug}`,
        );
      }
      return {
        productId: product.id,
        status: 'published',
        images: images.length,
      };
    }
    if (product.is_active) {
      await api.delete(`/products/${product.id}`, MutationSchema);
    }
  } else {
    await api.post(
      '/products',
      explicitProductBody(slug, categoryId, release),
      MutationSchema,
    );
  }

  const draft = await api.getAdminProduct(slug);
  if (draft.kind === 'missing') {
    throw new ApiContractError(
      `product ${slug} disappeared after creation/deactivation`,
    );
  }
  product = draft.product;
  if (product.is_active) {
    throw new ApiContractError(
      `product ${slug} is active during repair; refusing Cloudinary/product writes`,
    );
  }

  await api.patch(
    `/products/${product.id}`,
    explicitProductBody(slug, categoryId, release),
    MutationSchema,
  );
  const factsUpdated = await api.getAdminProduct(slug);
  if (factsUpdated.kind === 'missing') {
    throw new ApiContractError(
      `product ${slug} disappeared after release-fact update`,
    );
  }
  product = factsUpdated.product;

  const variantIds = await reconcileVariants(api, product, variants);
  const refreshed = await api.getAdminProduct(slug);
  if (refreshed.kind === 'missing') {
    throw new ApiContractError(
      `product ${slug} disappeared before image reconciliation`,
    );
  }
  await reconcileImages(api, refreshed.product, images, urls, variantIds);
  const complete = await api.getAdminProduct(slug);
  if (complete.kind === 'missing') {
    throw new ApiContractError(
      `product ${slug} disappeared before publication`,
    );
  }
  if (!productIsComplete(complete.product, variants, images, release)) {
    throw new ApiContractError(
      `product ${slug} is incomplete after repair; left inactive`,
    );
  }
  if (complete.product.is_active) {
    throw new ApiContractError(
      `product ${slug} became active before publication`,
    );
  }
  await api.patch(
    `/products/${complete.product.id}${visibilityMutationPath(complete.product)}`,
    {},
    MutationSchema,
  );
  const published = await api.getAdminProduct(slug);
  if (
    published.kind === 'missing' ||
    !published.product.is_active ||
    !productIsComplete(published.product, variants, images, release)
  ) {
    throw new ApiContractError(
      `publish contract did not return a complete active product for ${slug}`,
    );
  }
  return {
    productId: published.product.id,
    status: 'published',
    images: images.length,
  };
}

export async function prepareDraftForRepair(
  api: Api,
  existing: AdminProductLookup,
  slug: string,
  categoryId: string,
  release: ReleaseMetadata,
  variants: ExpectedVariant[],
  images: ExpectedImage[],
): Promise<AdminProductLookup> {
  if (existing.kind === 'missing') {
    await api.post(
      '/products',
      explicitProductBody(slug, categoryId, release),
      MutationSchema,
    );
    const created = await api.getAdminProduct(slug);
    if (created.kind === 'missing') {
      throw new ApiContractError(
        `product ${slug} disappeared after draft creation`,
      );
    }
    if (created.product.is_active) {
      throw new ApiContractError(
        `product ${slug} was active immediately after draft creation`,
      );
    }
    assertCustomerSafeDescription(created.product, slug);
    return created;
  }
  if (
    !existing.product.is_active ||
    productIsComplete(existing.product, variants, images, release)
  ) {
    return existing;
  }
  await api.delete(`/products/${existing.product.id}`, MutationSchema);
  const refreshed = await api.getAdminProduct(slug);
  if (refreshed.kind === 'missing') {
    throw new ApiContractError(
      `product ${slug} disappeared after deactivation`,
    );
  }
  if (refreshed.product.is_active) {
    throw new ApiContractError(
      `product ${slug} remained active during repair preparation`,
    );
  }
  return refreshed;
}
