/**
 * Upload QA-signed-off scenes and reconcile an inactive catalog product.
 *
 * Every product, variant, and image has a deterministic identity. A rerun after
 * an interrupted upload repairs missing records instead of skipping the slug.
 * Publication is the final, separately protected operation and is attempted
 * only after an admin read proves the expected complete gallery.
 */
import 'dotenv/config';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import { z } from 'zod';
import { SCENES_DIR, cloudinaryFolder } from './config.js';
import { generationReadyItems, loadManifest } from './state.js';
import { requireUploadMetadata } from './release.js';
import type { ManifestItem, ProductType, ReleaseMetadata } from './types.js';

export const DEFAULT_API = 'https://sunfabb-backend.onrender.com';
export const SCENE_ORDER = ['hero', 'closeup', 'folded', 'room'] as const;
export type Scene = (typeof SCENE_ORDER)[number];
const SCENES_ROOT = SCENES_DIR;

/** Canonical lookup colours. These are filter swatches, not inferred fibre facts. */
const PALETTE: Record<string, string> = {
  beige: '#D9C7A7',
  'blue-grey-stripe': '#66788A',
  'blue-mint': '#78AFA8',
  'blue-red': '#6A5370',
  'blue-tan': '#8B8074',
  'blue-white-plaid': '#8CA5B8',
  'blue-grey': '#7A8CA3',
  brown: '#6B4A32',
  'brown-coral': '#9B6250',
  burgundy: '#6E1F2E',
  'burgundy-grey': '#735762',
  'burgundy-pink': '#A64F6B',
  'charcoal-coral': '#805D59',
  'charcoal-white': '#777674',
  copper: '#B4703A',
  'coral-black': '#8A4B43',
  'coral-red': '#C04E45',
  'coral-sage': '#A17A68',
  cream: '#F3EBDD',
  'dark-grey': '#4A4A4A',
  'dusty-pink-grey': '#9A7F87',
  'emerald-brown': '#426052',
  'green-coral-stripe': '#708064',
  'grey-blue': '#8296A8',
  'grey-navy': '#566071',
  'hot-pink': '#E0457B',
  'light-blue': '#A8C6E0',
  'magenta-cream': '#B67591',
  maroon: '#7B2D3B',
  multicolour: '#8B6F75',
  'multicolour-plaid': '#81746E',
  'navy-ochre-stripe': '#71623D',
  'ochre-forest': '#777037',
  'ochre-grey-plaid': '#93846B',
  'ochre-plum': '#8C5E55',
  'ochre-purple': '#8B6370',
  olive: '#7A7B3F',
  'olive-brown': '#6E6238',
  orange: '#E07B39',
  'orange-red': '#D9482B',
  'pink-black': '#8E596B',
  'pink-black-stripe': '#875764',
  'pink-forest': '#7A6C65',
  purple: '#6B4C9A',
  red: '#B3282D',
  'red-black': '#711F25',
  'red-navy': '#622F43',
  'rose-burgundy': '#A04E67',
  'rose-olive-stripe': '#87705F',
  'sage-navy': '#66756F',
  salmon: '#F0917C',
  seafoam: '#8FC7B5',
  'sky-blue': '#87B8D7',
  'slate-blue': '#5E6E8C',
  tan: '#C89F6E',
  taupe: '#A79383',
  teal: '#2C7A7B',
  terracotta: '#C25B3E',
  yellow: '#E3B33C',
};

export interface Args { designs: string[]; tokenFile: string; api: string; dryRun: boolean }

export function parseArgs(argv: string[]): Args {
  const designs: string[] = [];
  let tokenFile = '';
  let api = DEFAULT_API;
  let dryRun = false;
  const requireValue = (flag: string, value: string | undefined): string => {
    if (value === undefined) throw new Error(`${flag} needs a value`);
    return value;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === '--token-file') tokenFile = requireValue(arg, argv[++i]);
    else if (arg === '--api') api = requireValue(arg, argv[++i]);
    else if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--')) throw new Error(`unknown flag: ${arg}`);
    else designs.push(arg);
  }
  if (!designs.length) throw new Error('pass at least one design id');
  if (new Set(designs).size !== designs.length) throw new Error('design ids must be unique');
  if (!dryRun && !tokenFile) throw new Error('--token-file is required unless --dry-run');
  return { designs, tokenFile, api: api.replace(/\/$/, ''), dryRun };
}

function toColorName(folder: string): string {
  return folder.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}
export function normalize(name: string): string { return name.toLowerCase().replace(/[\s-]+/g, '-'); }

export interface DesignInput { id: string; colorways: { color: string; scenes: Scene[] }[] }

/** Read a complete canonical scene set before any API or Cloudinary write. */
export function readDesign(designId: string): DesignInput {
  const dir = join(SCENES_ROOT, designId);
  if (!existsSync(dir)) throw new Error(`no scenes folder for design ${designId} at ${dir}`);
  const colors = readdirSync(dir).filter((entry) => !entry.startsWith('.') && statSync(join(dir, entry)).isDirectory()).sort();
  if (!colors.length) throw new Error(`design ${designId} has no colourway folders`);
  return {
    id: designId,
    colorways: colors.map((color) => {
      const files = readdirSync(join(dir, color)).filter((file) => file.endsWith('.png'));
      const unknown = files.filter((file) => !SCENE_ORDER.includes(file.replace('.png', '') as Scene));
      if (unknown.length) throw new Error(`design ${designId}/${color}: unrecognised scenes ${unknown.join(', ')}`);
      const missing = SCENE_ORDER.filter((scene) => !files.includes(`${scene}.png`));
      if (missing.length) throw new Error(`design ${designId}/${color}: missing canonical scenes ${missing.join(', ')}`);
      return { color, scenes: [...SCENE_ORDER] };
    }),
  };
}

export function categoryName(productType: Exclude<ProductType, 'unknown'>): string {
  return productType === 'bedsheet' ? 'Bedsheets' : productType === 'blanket' ? 'Blankets' : 'Bedspreads';
}
export function skuFor(productType: Exclude<ProductType, 'unknown'>, designNo: string, color: string): string {
  return `${productType.toUpperCase()}-${designNo}-${color.toUpperCase()}`;
}
export function publicIdFor(folder: string, designNo: string, color: string, scene: Scene): string {
  return `${folder}/products/${designNo}/${color}/${String(SCENE_ORDER.indexOf(scene) + 1).padStart(2, '0')}-${scene}`;
}

export interface ExpectedImage { color: string; scene: Scene; publicId: string; order: number; file: string; primary: boolean }
export function expectedImages(folder: string, design: DesignInput, designNo: string): ExpectedImage[] {
  const images: ExpectedImage[] = [];
  for (const colorway of design.colorways) for (const scene of SCENE_ORDER) {
    images.push({ color: colorway.color, scene, publicId: publicIdFor(folder, designNo, colorway.color, scene), order: SCENE_ORDER.indexOf(scene), file: join(SCENES_ROOT, design.id, colorway.color, `${scene}.png`), primary: images.length === 0 && scene === 'hero' });
  }
  return images;
}

const LookupSchema = z.object({ id: z.string().min(1), name: z.string().min(1) }).passthrough();
const MutationSchema = z.object({ id: z.string().min(1) }).passthrough();
const AdminVariantSchema = z.object({
  id: z.string().min(1), sku: z.string().min(1), is_active: z.boolean(), color_id: z.string().nullable().optional(),
  material_id: z.string().nullable().optional(), size: z.string().nullable().optional(), price: z.number().int().optional(),
  stock_quantity: z.number().int().optional(),
}).passthrough();
const AdminImageSchema = z.object({
  id: z.string().min(1), public_id: z.string().min(1).nullable().optional(), url: z.string().min(1),
  variant_id: z.string().nullable().optional(), image_role: z.string().nullable().optional(), sort_order: z.number().int().optional(), is_primary: z.boolean(),
}).passthrough();
export const AdminProductSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  is_active: z.boolean(),
  description: z.string().nullable(),
  /** A null timestamp identifies a draft; a value identifies a product that may be restored. */
  published_at: z.string().datetime({ offset: true }).nullable(),
  variants: z.array(AdminVariantSchema),
  images: z.array(AdminImageSchema),
}).passthrough();
export type AdminProduct = z.infer<typeof AdminProductSchema>;
export type Lookup = z.infer<typeof LookupSchema>;

export class ApiHttpError extends Error {
  constructor(readonly method: string, readonly path: string, readonly status: number, detail: string) { super(`${method} ${path} -> ${status}: ${detail.slice(0, 400)}`); this.name = 'ApiHttpError'; }
}
export class ApiContractError extends Error {
  constructor(message: string, readonly cause?: unknown) { super(message); this.name = 'ApiContractError'; }
}
export type AdminProductLookup = { kind: 'missing' } | { kind: 'found'; product: AdminProduct };

export class Api {
  constructor(private readonly base: string, private readonly token: string) {}
  private async request(method: string, requestPath: string, body?: unknown): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(`${this.base}${requestPath}`, { method, headers: { 'Content-Type': 'application/json', ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    } catch (error) {
      throw new ApiContractError(`${method} ${requestPath} network failure; refusing to infer product absence`, error);
    }
    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { detail = 'response body unavailable'; }
      throw new ApiHttpError(method, requestPath, response.status, detail);
    }
    return response;
  }
  private async json<T>(response: Response, schema: z.ZodType<T>, method: string, requestPath: string): Promise<T> {
    let body: unknown;
    try { body = await response.json(); } catch (error) { throw new ApiContractError(`${method} ${requestPath} returned invalid JSON`, error); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new ApiContractError(`${method} ${requestPath} returned an unexpected response shape: ${parsed.error.message}`);
    return parsed.data;
  }
  async get<T>(requestPath: string, schema: z.ZodType<T>): Promise<T> { return this.json(await this.request('GET', requestPath), schema, 'GET', requestPath); }
  async post<T>(requestPath: string, body: unknown, schema: z.ZodType<T>): Promise<T> { return this.json(await this.request('POST', requestPath, body), schema, 'POST', requestPath); }
  async patch<T>(requestPath: string, body: unknown, schema: z.ZodType<T>): Promise<T> { return this.json(await this.request('PATCH', requestPath, body), schema, 'PATCH', requestPath); }
  async delete<T>(requestPath: string, schema: z.ZodType<T>): Promise<T> { return this.json(await this.request('DELETE', requestPath), schema, 'DELETE', requestPath); }

  /** Protected admin detail: only a genuine 404 is an absent product. */
  async getAdminProduct(slug: string): Promise<AdminProductLookup> {
    const requestPath = `/products/admin/${encodeURIComponent(slug)}`;
    let response: Response;
    try {
      response = await fetch(`${this.base}${requestPath}`, { method: 'GET', headers: { 'Content-Type': 'application/json', ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) } });
    } catch (error) { throw new ApiContractError(`${requestPath} network failure; refusing to infer product absence`, error); }
    if (response.status === 404) return { kind: 'missing' };
    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { detail = 'response body unavailable'; }
      throw new ApiHttpError('GET', requestPath, response.status, detail);
    }
    return { kind: 'found', product: await this.json(response, AdminProductSchema, 'GET', requestPath) };
  }
  /** Detects a missing admin route when it falsely returns 404 for an existing public product. */
  async publicProductExists(slug: string): Promise<boolean> {
    const requestPath = `/products/${encodeURIComponent(slug)}`;
    let response: Response;
    try { response = await fetch(`${this.base}${requestPath}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } }); }
    catch (error) { throw new ApiContractError(`${requestPath} network failure; refusing to infer product absence`, error); }
    if (response.status === 404) return false;
    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { detail = 'response body unavailable'; }
      throw new ApiHttpError('GET', requestPath, response.status, detail);
    }
    return true;
  }
}

function cloudinaryCredentials(): { cloud_name: string; api_key: string; api_secret: string } {
  const keys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const;
  const resolved: Record<string, string> = {};
  for (const key of keys) resolved[key] = (process.env[key] ?? '').trim();
  if (keys.some((key) => !resolved[key])) {
    const backendEnv = resolve(import.meta.dirname, '../../../backend/.env');
    if (existsSync(backendEnv)) for (const line of readFileSync(backendEnv, 'utf8').split('\n')) {
      const match = /^\s*([A-Z_]+)\s*=\s*(.*)$/.exec(line);
      if (!match?.[1] || !match[2]) continue;
      const key = match[1];
      if (!keys.includes(key as (typeof keys)[number]) || resolved[key]) continue;
      resolved[key] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  const missing = keys.filter((key) => !resolved[key]);
  if (missing.length) throw new Error(`missing Cloudinary credentials: ${missing.join(', ')}`);
  return { cloud_name: resolved.CLOUDINARY_CLOUD_NAME!, api_key: resolved.CLOUDINARY_API_KEY!, api_secret: resolved.CLOUDINARY_API_SECRET! };
}

const CloudinaryUploadSchema = z.object({ secure_url: z.string().min(1), public_id: z.string().min(1) });
const VariantExpectedSchema = z.object({ color: z.string().min(1), sku: z.string().min(1), colorId: z.string().min(1), materialId: z.string().min(1), size: z.string().min(1), price: z.number().int().positive(), stock: z.number().int().min(0) });
export type ExpectedVariant = z.infer<typeof VariantExpectedSchema>;

function expectedVariants(design: DesignInput, productType: Exclude<ProductType, 'unknown'>, designNo: string, release: ReleaseMetadata, material: Lookup, colors: Map<string, Lookup>): ExpectedVariant[] {
  return design.colorways.map((colorway) => {
    const color = colors.get(normalize(colorway.color));
    if (!color) throw new Error(`colour ${colorway.color} still missing after creation step`);
    return VariantExpectedSchema.parse({ color: colorway.color, sku: skuFor(productType, designNo, colorway.color), colorId: color.id, materialId: material.id, size: release.variantSize, price: release.pricePaise, stock: release.stockQuantity });
  });
}

export function productIsComplete(product: AdminProduct, variants: ExpectedVariant[], images: ExpectedImage[]): boolean {
  // A complete gallery and variant set must never turn operator notes into a
  // customer-visible product. The backend applies the same fail-closed rule
  // at publish time; keeping it here prevents the pipeline from returning
  // `already-complete` and skipping that protection for an active legacy row.
  if (!isCustomerSafeDescription(product.description)) return false;

  const bySku = new Map<string, AdminProduct['variants'][number]>();
  for (const variant of product.variants) {
    if (bySku.has(variant.sku)) return false;
    bySku.set(variant.sku, variant);
  }
  if (variants.some((expected) => {
    const found = bySku.get(expected.sku);
    return !found || !found.is_active || !variantMatchesExpected(found, expected);
  })) return false;
  const variantIdByColor = new Map(variants.map((expected) => [expected.color, bySku.get(expected.sku)?.id]));
  const byPublicId = new Map<string, AdminProduct['images'][number]>();
  for (const image of product.images) {
    if (!image.public_id) continue;
    if (byPublicId.has(image.public_id)) return false;
    byPublicId.set(image.public_id, image);
  }
  if (images.some((expected) => {
    const found = byPublicId.get(expected.publicId);
    return !found || found.image_role !== 'GALLERY' || found.sort_order !== expected.order || found.is_primary !== expected.primary || found.variant_id !== variantIdByColor.get(expected.color);
  })) return false;
  const galleryPrimaries = product.images.filter((image) => image.image_role === 'GALLERY' && image.is_primary);
  return galleryPrimaries.length === 1 && images.some((expected) => expected.primary && byPublicId.get(expected.publicId)?.is_primary === true);
}

const INTERNAL_COPY_PATTERN =
  /\b(?:admin(?:\s+catalog)?|internal|placeholder|refine|tbd|todo)\b/i;

export function isCustomerSafeDescription(description: string | null): boolean {
  const trimmed = description?.trim();
  if (!trimmed) return false;
  return !INTERNAL_COPY_PATTERN.test(trimmed);
}

function assertCustomerSafeDescription(product: AdminProduct, slug: string): void {
  if (!isCustomerSafeDescription(product.description)) {
    throw new ApiContractError(
      `product ${slug} has internal or missing customer copy; refusing repair/publication until owner-approved description is recorded`,
    );
  }
}

function variantMatchesExpected(found: AdminProduct['variants'][number], expected: ExpectedVariant): boolean {
  return found.color_id === expected.colorId &&
    found.material_id === expected.materialId &&
    found.size === expected.size &&
    found.price === expected.price &&
    found.stock_quantity === expected.stock;
}

function assertVariantCompatible(found: AdminProduct['variants'][number], expected: ExpectedVariant): void {
  if (!found.is_active) throw new ApiContractError(`variant ${expected.sku} exists but is inactive; no variant activation contract is available`);
  const mismatches: string[] = [];
  if (found.color_id !== expected.colorId) mismatches.push('color');
  if (found.material_id !== expected.materialId) mismatches.push('material');
  if (found.size !== expected.size) mismatches.push('size');
  if (found.price !== expected.price) mismatches.push('price');
  if (found.stock_quantity !== expected.stock) mismatches.push('stock');
  if (mismatches.length) throw new ApiContractError(`existing variant ${expected.sku} differs in ${mismatches.join(', ')}; no variant update contract is available`);
}

async function reconcileVariants(api: Api, product: AdminProduct, expected: ExpectedVariant[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const bySku = new Map<string, AdminProduct['variants'][number]>();
  for (const variant of product.variants) {
    if (bySku.has(variant.sku)) throw new ApiContractError(`duplicate existing SKU ${variant.sku} on product ${product.id}`);
    bySku.set(variant.sku, variant);
  }
  for (const variant of expected) {
    const existing = bySku.get(variant.sku);
    if (existing) { assertVariantCompatible(existing, variant); result.set(variant.color, existing.id); continue; }
    const created = await api.post(`/products/${product.id}/variants`, { color_id: variant.colorId, material_id: variant.materialId, size: variant.size, price: variant.price, stock_quantity: variant.stock, sku: variant.sku }, MutationSchema);
    result.set(variant.color, created.id);
  }
  return result;
}

async function reconcileImages(api: Api, product: AdminProduct, uploaded: ExpectedImage[], urls: Map<string, string>, variantIds: Map<string, string>): Promise<void> {
  const byPublicId = new Map<string, AdminProduct['images'][number]>();
  for (const image of product.images) {
    if (!image.public_id) continue;
    if (byPublicId.has(image.public_id)) throw new ApiContractError(`duplicate existing public_id ${image.public_id} on product ${product.id}`);
    byPublicId.set(image.public_id, image);
  }
  for (const image of uploaded) {
    const variantId = variantIds.get(image.color);
    if (!variantId) throw new ApiContractError(`missing variant id for ${image.color}`);
    const existing = byPublicId.get(image.publicId);
    if (existing) {
      if (existing.image_role !== 'GALLERY') throw new ApiContractError(`existing ${image.publicId} is not a gallery image`);
      if (existing.variant_id !== variantId) throw new ApiContractError(`existing ${image.publicId} is attached to a different variant`);
      if (existing.sort_order !== image.order) throw new ApiContractError(`existing ${image.publicId} has the wrong gallery order`);
      if (existing.is_primary !== image.primary) throw new ApiContractError(`existing ${image.publicId} has the wrong primary flag`);
      continue;
    }
    const url = urls.get(image.publicId);
    if (!url) throw new ApiContractError(`missing Cloudinary URL for ${image.publicId}`);
    await api.post(`/products/${product.id}/images`, { url, public_id: image.publicId, variant_id: variantId, image_role: 'GALLERY', sort_order: image.order, is_primary: image.primary, alt_text: `${image.color.replace(/-/g, ' ')} ${image.scene}` }, MutationSchema);
  }
}

async function uploadAssets(all: ExpectedImage[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  for (const image of all) {
    const result = CloudinaryUploadSchema.parse(await cloudinary.uploader.upload(image.file, { public_id: image.publicId, overwrite: true, invalidate: true, resource_type: 'image' }));
    if (result.public_id !== image.publicId) throw new ApiContractError(`Cloudinary returned ${result.public_id} for requested ${image.publicId}`);
    urls.set(image.publicId, result.secure_url);
  }
  return urls;
}

function explicitProductBody(slug: string, categoryId: string, release: ReleaseMetadata): Record<string, unknown> {
  return { name: release.commercialName, slug, category_id: categoryId, description: release.description, care_instructions: release.careInstructions };
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

/**
 * Reconcile one product using stable SKU/public-id identities. This is kept
 * separate from the Cloudinary and manifest plumbing so a failed rerun can be
 * exercised with a fake API without touching external services.
 */
export async function reconcileProduct({ api, existing, slug, categoryId, release, variants, images, urls }: ReconcileProductArgs): Promise<ReconcileProductResult> {
  let product: AdminProduct;
  if (existing.kind === 'found') {
    product = existing.product;
    if (product.slug !== slug) throw new ApiContractError(`admin product slug mismatch for ${slug}`);
    if (product.is_active && productIsComplete(product, variants, images)) {
      return { productId: product.id, status: 'already-complete', images: images.length };
    }
    if (!product.is_active && productIsComplete(product, variants, images)) {
      await api.patch(`/products/${product.id}${visibilityMutationPath(product)}`, {}, MutationSchema);
      const published = await api.getAdminProduct(slug);
      if (published.kind === 'missing' || !published.product.is_active || !productIsComplete(published.product, variants, images)) {
        throw new ApiContractError(`publish contract did not return a complete active product for ${slug}`);
      }
      return { productId: product.id, status: 'published', images: images.length };
    }
    if (product.is_active) {
      await api.delete(`/products/${product.id}`, MutationSchema);
    }
  } else {
    await api.post('/products', explicitProductBody(slug, categoryId, release), MutationSchema);
  }

  const draft = await api.getAdminProduct(slug);
  if (draft.kind === 'missing') throw new ApiContractError(`product ${slug} disappeared after creation/deactivation`);
  product = draft.product;
  if (product.is_active) throw new ApiContractError(`product ${slug} is active during repair; refusing Cloudinary/product writes`);

  const variantIds = await reconcileVariants(api, product, variants);
  const refreshed = await api.getAdminProduct(slug);
  if (refreshed.kind === 'missing') throw new ApiContractError(`product ${slug} disappeared before image reconciliation`);
  await reconcileImages(api, refreshed.product, images, urls, variantIds);
  const complete = await api.getAdminProduct(slug);
  if (complete.kind === 'missing') throw new ApiContractError(`product ${slug} disappeared before publication`);
  if (!productIsComplete(complete.product, variants, images)) throw new ApiContractError(`product ${slug} is incomplete after repair; left inactive`);
  if (complete.product.is_active) throw new ApiContractError(`product ${slug} became active before publication`);
  await api.patch(`/products/${complete.product.id}${visibilityMutationPath(complete.product)}`, {}, MutationSchema);
  const published = await api.getAdminProduct(slug);
  if (published.kind === 'missing' || !published.product.is_active || !productIsComplete(published.product, variants, images)) throw new ApiContractError(`publish contract did not return a complete active product for ${slug}`);
  return { productId: published.product.id, status: 'published', images: images.length };
}

export async function prepareDraftForRepair(api: Api, existing: AdminProductLookup, slug: string, categoryId: string, release: ReleaseMetadata, variants: ExpectedVariant[], images: ExpectedImage[]): Promise<AdminProductLookup> {
  if (existing.kind === 'missing') {
    await api.post('/products', explicitProductBody(slug, categoryId, release), MutationSchema);
    const created = await api.getAdminProduct(slug);
    if (created.kind === 'missing') throw new ApiContractError(`product ${slug} disappeared after draft creation`);
    if (created.product.is_active) throw new ApiContractError(`product ${slug} was active immediately after draft creation`);
    assertCustomerSafeDescription(created.product, slug);
    return created;
  }
  if (!existing.product.is_active || productIsComplete(existing.product, variants, images)) {
    assertCustomerSafeDescription(existing.product, slug);
    return existing;
  }
  // Publication state is controlled only by the explicit lifecycle endpoints.
  // The existing soft-delete route is the supported way to hide a legacy
  // active-but-incomplete product before repairing it.
  await api.delete(`/products/${existing.product.id}`, MutationSchema);
  const refreshed = await api.getAdminProduct(slug);
  if (refreshed.kind === 'missing') throw new ApiContractError(`product ${slug} disappeared after deactivation`);
  if (refreshed.product.is_active) throw new ApiContractError(`product ${slug} remained active during repair preparation`);
  assertCustomerSafeDescription(refreshed.product, slug);
  return refreshed;
}

export async function runUploadDesigns(args: Args): Promise<void> {
  const manifest = loadManifest();
  const byDesign = new Map(manifest.items.map((item) => [item.designNo, item]));
  const ready = new Map(generationReadyItems(manifest).map((item) => [item.designNo, item]));
  const entries: { item: ManifestItem; release: ReleaseMetadata; design: DesignInput; designNo: string; slug: string }[] = [];
  // All local and release gates run before token/API/Cloudinary access.
  for (const designId of args.designs) {
    const item = byDesign.get(designId);
    if (!item) throw new Error(`refusing upload for ${designId}: design is missing from the manifest`);
    const readyItem = ready.get(designId);
    if (!readyItem) throw new Error(`refusing upload for ${designId}: complete release classification is required`);
    const release = requireUploadMetadata(readyItem);
    const design = readDesign(designId);
    const designNo = release.commercialDesignNo!;
    entries.push({ item: readyItem, release, design, designNo, slug: `bedspread-design-${designNo}` });
  }
  if (new Set(entries.map((entry) => entry.slug)).size !== entries.length) {
    throw new Error('refusing upload: release metadata contains duplicate commercial design numbers');
  }
  if (args.dryRun) {
    for (const entry of entries) {
      const images = expectedImages('sunfabb', entry.design, entry.designNo);
      console.log(`[dry-run] ${entry.slug}: ${images.length} deterministic image(s), ${entry.design.colorways.length} variant(s), inactive until complete then PATCH /products/:id/publish`);
      for (const image of images) console.log(`  [dry-run] would upload ${image.publicId}`);
    }
    return;
  }
  const token = readFileSync(args.tokenFile, 'utf8').trim();
  if (!token) throw new Error(`token file ${args.tokenFile} is empty`);
  const api = new Api(args.api, token);
  const credentials = cloudinaryCredentials();
  cloudinary.config({ ...credentials, secure: true });
  await cloudinary.api.ping();
  const [categories, initialMaterials, initialColors] = await Promise.all([
    api.get('/categories', z.array(LookupSchema)), api.get('/materials', z.array(LookupSchema)), api.get('/colors', z.array(LookupSchema)),
  ]);
  const categoryByType = new Map<Exclude<ProductType, 'unknown'>, Lookup>();
  for (const entry of entries) {
    const type = entry.release.productType;
    if (type === 'unknown') throw new Error(`unknown product type for ${entry.designNo}`);
    const category = categories.find((candidate) => candidate.name === categoryName(type));
    if (!category) throw new ApiContractError(`category "${categoryName(type)}" is missing; backend lookup contract is incomplete`);
    categoryByType.set(type, category);
  }
  const existing = new Map<string, AdminProductLookup>();
  for (const entry of entries) {
    const found = await api.getAdminProduct(entry.slug);
    if (found.kind === 'missing' && await api.publicProductExists(entry.slug)) throw new ApiContractError(`GET /products/admin/:slug returned 404 while public product ${entry.slug} exists; protected admin detail contract is unavailable`);
    existing.set(entry.designNo, found);
  }
  let materials = initialMaterials;
  const materialNames = [...new Set(entries.map((entry) => entry.release.materialName!))].sort();
  for (const name of materialNames) if (!materials.some((material) => material.name === name)) await api.post('/materials', { name }, LookupSchema);
  if (materialNames.some((name) => !materials.some((material) => material.name === name))) materials = await api.get('/materials', z.array(LookupSchema));
  const materialByName = new Map(materials.map((material) => [material.name, material]));
  let colors = initialColors;
  const usedColors = [...new Set(entries.flatMap((entry) => entry.design.colorways.map((colorway) => colorway.color)))].sort();
  const missingColors = usedColors.filter((color) => !colors.some((lookup) => normalize(lookup.name) === normalize(color)));
  for (const color of missingColors) {
    const hex = PALETTE[color];
    if (!hex) throw new Error(`no canonical hex defined for ${color}; add it to PALETTE before writing`);
    await api.post('/colors', { name: toColorName(color), hex_code: hex }, LookupSchema);
  }
  if (missingColors.length) colors = await api.get('/colors', z.array(LookupSchema));
  const colorByName = new Map(colors.map((color) => [normalize(color.name), color]));
  const report: unknown[] = [];
  for (const entry of entries) {
    const type = entry.release.productType;
    if (type === 'unknown') throw new Error(`unknown product type for ${entry.designNo}`);
    const material = materialByName.get(entry.release.materialName!);
    if (!material) throw new ApiContractError(`material ${entry.release.materialName} is unavailable after lookup/create`);
    const category = categoryByType.get(type)!;
    const images = expectedImages(cloudinaryFolder(), entry.design, entry.designNo);
    const variants = expectedVariants(entry.design, type, entry.designNo, entry.release, material, colorByName);
    const existingProduct = await prepareDraftForRepair(api, existing.get(entry.designNo)!, entry.slug, category.id, entry.release, variants, images);
    const needsAssets = existingProduct.kind === 'missing' || !productIsComplete(existingProduct.product, variants, images);
    const urls = needsAssets ? await uploadAssets(images) : new Map<string, string>();
    const result = await reconcileProduct({ api, existing: existingProduct, slug: entry.slug, categoryId: category.id, release: entry.release, variants, images, urls });
    report.push({ design: entry.designNo, slug: entry.slug, productId: result.productId, status: result.status, images: result.images });
  }
  console.log(JSON.stringify(report, null, 2));
}

const isCliEntry = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isCliEntry) runUploadDesigns(parseArgs(process.argv.slice(2))).catch((error: unknown) => {
  const detail = error instanceof Error ? error.stack ?? error.message : JSON.stringify(error, null, 2);
  console.error(`\nFAILED: ${detail}`);
  process.exitCode = 1;
});
