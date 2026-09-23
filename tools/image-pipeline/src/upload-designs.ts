/**
 * Upload QA-signed-off scenes and reconcile inactive catalog products.
 *
 * This entrypoint owns orchestration only. Boundary contracts, local input
 * discovery, Cloudinary transport, and catalog reconciliation live in focused
 * modules so each part can be tested and changed independently.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { cloudinaryFolder } from './config.js';
import { requireUploadMetadata } from './release.js';
import { generationReadyItems, loadManifest } from './state.js';
import type { ManifestItem, ProductType, ReleaseMetadata } from './types.js';
import { Api } from './upload-designs-api.js';
import {
  LookupSchema,
  expectedVariants,
  productIsComplete,
  type AdminProductLookup,
  type Lookup,
} from './upload-designs-contracts.js';
import {
  PALETTE,
  configureCloudinary,
  uploadAssets,
} from './upload-designs-cloudinary.js';
import { ApiContractError } from './upload-designs-errors.js';
import {
  categoryName,
  expectedImages,
  normalize,
  parseArgs,
  readDesign,
  toColorName,
  type Args,
  type DesignInput,
} from './upload-designs-input.js';
import {
  prepareDraftForRepair,
  reconcileProduct,
} from './upload-designs-reconcile.js';

export { Api } from './upload-designs-api.js';
export { ApiContractError, ApiHttpError } from './upload-designs-errors.js';
export {
  AdminProductSchema,
  explicitProductBody,
  isCustomerSafeDescription,
  productIsComplete,
  type AdminProduct,
  type AdminProductLookup,
  type ExpectedVariant,
  type Lookup,
} from './upload-designs-contracts.js';
export {
  DEFAULT_API,
  SCENE_ORDER,
  categoryName,
  expectedImages,
  normalize,
  parseArgs,
  publicIdFor,
  readDesign,
  skuFor,
  toColorName,
  type Args,
  type DesignInput,
  type ExpectedImage,
  type Scene,
} from './upload-designs-input.js';
export {
  prepareDraftForRepair,
  reconcileProduct,
  type ReconcileProductArgs,
  type ReconcileProductResult,
} from './upload-designs-reconcile.js';

interface UploadEntry {
  item: ManifestItem;
  release: ReleaseMetadata;
  design: DesignInput;
  designNo: string;
  slug: string;
}

function prepareEntries(args: Args): UploadEntry[] {
  const manifest = loadManifest();
  const byDesign = new Map(manifest.items.map((item) => [item.designNo, item]));
  const ready = new Map(
    generationReadyItems(manifest).map((item) => [item.designNo, item]),
  );
  const entries: UploadEntry[] = [];

  // Resolve every local and owner-release gate before token/API/Cloudinary use.
  for (const designId of args.designs) {
    if (!byDesign.has(designId)) {
      throw new Error(
        `refusing upload for ${designId}: design is missing from the manifest`,
      );
    }
    const item = ready.get(designId);
    if (!item) {
      throw new Error(
        `refusing upload for ${designId}: complete release classification is required`,
      );
    }
    const release = requireUploadMetadata(item);
    const designNo = release.commercialDesignNo!;
    entries.push({
      item,
      release,
      design: readDesign(designId),
      designNo,
      slug: `bedspread-design-${designNo}`,
    });
  }

  if (new Set(entries.map((entry) => entry.slug)).size !== entries.length) {
    throw new Error(
      'refusing upload: release metadata contains duplicate commercial design numbers',
    );
  }
  return entries;
}

function printDryRun(entries: UploadEntry[]): void {
  for (const entry of entries) {
    const images = expectedImages('sunfabb', entry.design, entry.designNo);
    console.log(
      `[dry-run] ${entry.slug}: ${images.length} deterministic image(s), ${entry.design.colorways.length} variant(s), inactive until complete then PATCH /products/:id/publish`,
    );
    for (const image of images) {
      console.log(`  [dry-run] would upload ${image.publicId}`);
    }
  }
}

async function ensureLookups(
  api: Api,
  entries: UploadEntry[],
): Promise<{
  categoryByType: Map<Exclude<ProductType, 'unknown'>, Lookup>;
  materialByName: Map<string, Lookup>;
  colorByName: Map<string, Lookup>;
}> {
  const [categories, initialMaterials, initialColors] = await Promise.all([
    api.get('/categories', z.array(LookupSchema)),
    api.get('/materials', z.array(LookupSchema)),
    api.get('/colors', z.array(LookupSchema)),
  ]);

  const categoryByType = new Map<Exclude<ProductType, 'unknown'>, Lookup>();
  for (const entry of entries) {
    const type = entry.release.productType;
    if (type === 'unknown') {
      throw new Error(`unknown product type for ${entry.designNo}`);
    }
    const expectedName = categoryName(type);
    const category = categories.find(
      (candidate) => candidate.name === expectedName,
    );
    if (!category) {
      throw new ApiContractError(
        `category "${expectedName}" is missing; backend lookup contract is incomplete`,
      );
    }
    categoryByType.set(type, category);
  }

  let materials = initialMaterials;
  const materialNames = [
    ...new Set(entries.map((entry) => entry.release.materialName!)),
  ].sort();
  for (const name of materialNames) {
    if (!materials.some((material) => material.name === name)) {
      await api.post('/materials', { name }, LookupSchema);
    }
  }
  if (
    materialNames.some(
      (name) => !materials.some((material) => material.name === name),
    )
  ) {
    materials = await api.get('/materials', z.array(LookupSchema));
  }

  let colors = initialColors;
  const usedColors = [
    ...new Set(
      entries.flatMap((entry) =>
        entry.design.colorways.map((colorway) => colorway.color),
      ),
    ),
  ].sort();
  const missingColors = usedColors.filter(
    (color) =>
      !colors.some((lookup) => normalize(lookup.name) === normalize(color)),
  );
  for (const color of missingColors) {
    const hex = PALETTE[color];
    if (!hex) {
      throw new Error(
        `no canonical hex defined for ${color}; add it to PALETTE before writing`,
      );
    }
    await api.post(
      '/colors',
      { name: toColorName(color), hex_code: hex },
      LookupSchema,
    );
  }
  if (missingColors.length > 0) {
    colors = await api.get('/colors', z.array(LookupSchema));
  }

  return {
    categoryByType,
    materialByName: new Map(
      materials.map((material) => [material.name, material]),
    ),
    colorByName: new Map(
      colors.map((color) => [normalize(color.name), color]),
    ),
  };
}

async function loadExistingProducts(
  api: Api,
  entries: UploadEntry[],
): Promise<Map<string, AdminProductLookup>> {
  const existing = new Map<string, AdminProductLookup>();
  for (const entry of entries) {
    const found = await api.getAdminProduct(entry.slug);
    if (
      found.kind === 'missing' &&
      (await api.publicProductExists(entry.slug))
    ) {
      throw new ApiContractError(
        `GET /products/admin/:slug returned 404 while public product ${entry.slug} exists; protected admin detail contract is unavailable`,
      );
    }
    existing.set(entry.designNo, found);
  }
  return existing;
}

export async function runUploadDesigns(args: Args): Promise<void> {
  const entries = prepareEntries(args);
  if (args.dryRun) {
    printDryRun(entries);
    return;
  }

  const token = readFileSync(args.tokenFile, 'utf8').trim();
  if (!token) throw new Error(`token file ${args.tokenFile} is empty`);

  const api = new Api(args.api, token);
  await configureCloudinary();
  const lookups = await ensureLookups(api, entries);
  const existing = await loadExistingProducts(api, entries);
  const report: unknown[] = [];

  for (const entry of entries) {
    const type = entry.release.productType;
    if (type === 'unknown') {
      throw new Error(`unknown product type for ${entry.designNo}`);
    }
    const material = lookups.materialByName.get(entry.release.materialName!);
    if (!material) {
      throw new ApiContractError(
        `material ${entry.release.materialName} is unavailable after lookup/create`,
      );
    }
    const category = lookups.categoryByType.get(type)!;
    const images = expectedImages(
      cloudinaryFolder(),
      entry.design,
      entry.designNo,
    );
    const variants = expectedVariants(
      entry.design,
      type,
      entry.designNo,
      entry.release,
      material,
      lookups.colorByName,
    );
    const existingProduct = await prepareDraftForRepair(
      api,
      existing.get(entry.designNo)!,
      entry.slug,
      category.id,
      entry.release,
      variants,
      images,
    );
    const needsAssets =
      existingProduct.kind === 'missing' ||
      !productIsComplete(
        existingProduct.product,
        variants,
        images,
        entry.release,
      );
    const urls = needsAssets
      ? await uploadAssets(images)
      : new Map<string, string>();
    const result = await reconcileProduct({
      api,
      existing: existingProduct,
      slug: entry.slug,
      categoryId: category.id,
      release: entry.release,
      variants,
      images,
      urls,
    });
    report.push({
      design: entry.designNo,
      slug: entry.slug,
      productId: result.productId,
      status: result.status,
      images: result.images,
    });
  }
  console.log(JSON.stringify(report, null, 2));
}

const isCliEntry =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isCliEntry) {
  runUploadDesigns(parseArgs(process.argv.slice(2))).catch((error: unknown) => {
    const detail =
      error instanceof Error
        ? (error.stack ?? error.message)
        : JSON.stringify(error, null, 2);
    console.error(`\nFAILED: ${detail}`);
    process.exitCode = 1;
  });
}
