import { z } from "zod";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// The documented Render free-tier cold start is roughly 24 seconds. This
// remains below Vercel's usual function budget while allowing one cold fetch
// to complete until the backend is moved to an always-on instance.
export const CATALOG_FETCH_TIMEOUT_MS = 30_000;
export const CATALOG_FETCH_RETRY_DELAY_MS = 250;
const MAX_TRANSIENT_RETRIES = 1;

export type CatalogFetchErrorKind =
  | "timeout"
  | "network"
  | "http"
  | "invalid_response";

export class CatalogFetchError extends Error {
  readonly name = "CatalogFetchError";

  constructor(
    message: string,
    readonly kind: CatalogFetchErrorKind,
    readonly status?: number,
  ) {
    super(message);
  }
}

export class NotFoundError extends Error {
  constructor() {
    super('Not found');
    this.name = 'NotFoundError';
  }
}

const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  image_url: z.string().nullable(),
});

const materialSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const colorSchema = z.object({
  id: z.string(),
  name: z.string(),
  hex_code: z.string().nullable(),
});

// The category embedded in a product response only carries name + slug
// (the backend selects a subset) — distinct from the full Category above.
const productCategorySchema = z.object({
  name: z.string(),
  slug: z.string(),
});

// The material/color embedded in a product variant only carries display
// fields, no id — distinct from the standalone lookup-table shapes above.
const variantMaterialSchema = z.object({
  name: z.string(),
});

const variantColorSchema = z.object({
  name: z.string(),
  hex_code: z.string().nullable(),
});

const productVariantSchema = z.object({
  id: z.string(),
  size: z.string(),
  price: z.number(), // paise
  stock_quantity: z.number(),
  material: variantMaterialSchema,
  color: variantColorSchema,
});

// The product-list endpoint (catalog grid) only selects each variant's
// price, to compute the lowest-price display — not the full variant shape.
const productListVariantSchema = z.object({
  price: z.number(), // paise
});

export const productImageRoleSchema = z.enum(["GALLERY", "SWATCH"]);

const productImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  alt_text: z.string().nullable(),
  is_primary: z.boolean(),
  sort_order: z.number(),
  variant_id: z.string().nullable(),
  image_role: productImageRoleSchema,
});

const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  care_instructions: z.string().nullable(),
  updated_at: z.string(),
  category: productCategorySchema,
  variants: z.array(productVariantSchema),
  images: z.array(productImageSchema),
});

const productListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  updated_at: z.string(),
  category: productCategorySchema,
  variants: z.array(productListVariantSchema),
  images: z.array(productImageSchema),
});

const productsResponseSchema = z.object({
  items: z.array(productListItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type Category = z.infer<typeof categorySchema>;
export type Material = z.infer<typeof materialSchema>;
export type Color = z.infer<typeof colorSchema>;
export type ProductVariant = z.infer<typeof productVariantSchema>;
export type ProductImage = z.infer<typeof productImageSchema>;
export type ProductImageRole = z.infer<typeof productImageRoleSchema>;
export type Product = z.infer<typeof productSchema>;
export type ProductListItem = z.infer<typeof productListItemSchema>;
export type ProductsResponse = z.infer<typeof productsResponseSchema>;

export interface ProductsQuery {
  categorySlug?: string;
  materialId?: string;
  colorId?: string;
  sortBy?: 'name' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
}

export function formatPrice(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
}

function requestPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split("?")[0] ?? url;
  }
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function logCatalogRequest(
  event: "catalog_api_retry" | "catalog_api_failure",
  url: string,
  attempt: number,
  error: CatalogFetchError,
  durationMs: number,
): void {
  console.warn(
    JSON.stringify({
      event,
      path: requestPath(url),
      attempt,
      error_kind: error.kind,
      status_code: error.status,
      duration_ms: durationMs,
    }),
  );
}

async function fetchOnce<T>(
  url: string,
  schema: z.ZodType<T>,
  init: RequestInit,
  errorMessage: string,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    CATALOG_FETCH_TIMEOUT_MS,
  );

  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (res.status === 404) throw new NotFoundError();
    if (!res.ok) {
      throw new CatalogFetchError(errorMessage, "http", res.status);
    }

    try {
      return schema.parse(await res.json());
    } catch {
      throw new CatalogFetchError(errorMessage, "invalid_response");
    }
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof CatalogFetchError) {
      throw error;
    }

    throw new CatalogFetchError(
      isAbortError(error) ? `${errorMessage} timed out` : errorMessage,
      isAbortError(error) ? "timeout" : "network",
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAndParse<T>(
  url: string,
  schema: z.ZodType<T>,
  init: RequestInit,
  errorMessage: string,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_TRANSIENT_RETRIES + 1; attempt += 1) {
    const startedAt = Date.now();
    try {
      return await fetchOnce(url, schema, init, errorMessage);
    } catch (error) {
      if (!(error instanceof CatalogFetchError)) throw error;

      const canRetry =
        (error.kind === "timeout" || error.kind === "network") &&
        attempt <= MAX_TRANSIENT_RETRIES;
      if (!canRetry) {
        logCatalogRequest(
          "catalog_api_failure",
          url,
          attempt,
          error,
          Date.now() - startedAt,
        );
        throw error;
      }

      logCatalogRequest(
        "catalog_api_retry",
        url,
        attempt,
        error,
        Date.now() - startedAt,
      );
      await new Promise<void>((resolve) => {
        setTimeout(resolve, CATALOG_FETCH_RETRY_DELAY_MS);
      });
    }
  }

  throw new Error("Unreachable catalogue request state");
}

export function getCategories(): Promise<Category[]> {
  return fetchAndParse(
    `${API_BASE}/categories`,
    z.array(categorySchema),
    { next: { revalidate: 60 } },
    'Failed to fetch categories',
  );
}

export function getMaterials(): Promise<Material[]> {
  return fetchAndParse(
    `${API_BASE}/materials`,
    z.array(materialSchema),
    { next: { revalidate: 60 } },
    'Failed to fetch materials',
  );
}

export function getColors(): Promise<Color[]> {
  return fetchAndParse(
    `${API_BASE}/colors`,
    z.array(colorSchema),
    { next: { revalidate: 60 } },
    'Failed to fetch colors',
  );
}

export function getPublicCategories(): Promise<Category[]> {
  return fetchAndParse(
    `${API_BASE}/categories/public`,
    z.array(categorySchema),
    { next: { revalidate: 60 } },
    'Failed to fetch public categories',
  );
}

export function getPublicMaterials(): Promise<Material[]> {
  return fetchAndParse(
    `${API_BASE}/materials/public`,
    z.array(materialSchema),
    { next: { revalidate: 60 } },
    'Failed to fetch public materials',
  );
}

export function getPublicColors(): Promise<Color[]> {
  return fetchAndParse(
    `${API_BASE}/colors/public`,
    z.array(colorSchema),
    { next: { revalidate: 60 } },
    'Failed to fetch public colors',
  );
}

export function getProducts(
  query: ProductsQuery = {},
): Promise<ProductsResponse> {
  const params = new URLSearchParams();
  if (query.categorySlug) params.set('categorySlug', query.categorySlug);
  if (query.materialId !== undefined)
    params.set('materialId', query.materialId);
  if (query.colorId !== undefined) params.set('colorId', query.colorId);
  if (query.sortBy) params.set('sortBy', query.sortBy);
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.limit !== undefined) params.set('limit', String(query.limit));

  const url = `${API_BASE}/products${params.size > 0 ? `?${params.toString()}` : ''}`;
  return fetchAndParse(
    url,
    productsResponseSchema,
    { next: { revalidate: 30 } },
    'Failed to fetch products',
  );
}

export function getProduct(slug: string): Promise<Product> {
  return fetchAndParse(
    `${API_BASE}/products/${slug}`,
    productSchema,
    { next: { revalidate: 30 } },
    `Failed to fetch product: ${slug}`,
  );
}
