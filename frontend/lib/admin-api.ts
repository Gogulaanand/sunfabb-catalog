import "server-only";
import { cookies } from "next/headers";
import { productImageRoleSchema, type Category, type Color, type Material, type ProductImageRole } from "./api";
import { z } from "zod";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export class AdminApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(getErrorMessage(body));
    this.status = status;
    this.body = body;
  }
}

function getErrorMessage(body: unknown): string {
  if (typeof body !== "object" || body === null || !("message" in body)) {
    return "Request failed";
  }

  const message = body.message;
  if (typeof message === "string") return message;
  if (
    Array.isArray(message) &&
    message.length > 0 &&
    message.every((item) => typeof item === "string")
  ) {
    return message.join("; ");
  }
  return "Request failed";
}

async function authHeaders(): Promise<HeadersInit> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new AdminApiError(res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

async function requestJson(path: string, init: RequestInit = {}): Promise<unknown> {
  return request<unknown>(path, init);
}

// --- Categories ---

export interface CategoryInput {
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
}

export function listCategories(): Promise<Category[]> {
  return request("/categories");
}

export function createCategory(input: CategoryInput): Promise<Category> {
  return request("/categories", { method: "POST", body: JSON.stringify(input) });
}

export function updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
  return request(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteCategory(id: string): Promise<void> {
  return request(`/categories/${id}`, { method: "DELETE" });
}

// --- Materials ---

export interface MaterialInput {
  name: string;
}

export function listMaterials(): Promise<Material[]> {
  return request("/materials");
}

export function createMaterial(input: MaterialInput): Promise<Material> {
  return request("/materials", { method: "POST", body: JSON.stringify(input) });
}

export function updateMaterial(id: string, input: Partial<MaterialInput>): Promise<Material> {
  return request(`/materials/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteMaterial(id: string): Promise<void> {
  return request(`/materials/${id}`, { method: "DELETE" });
}

// --- Colors ---

export interface ColorInput {
  name: string;
  hex_code?: string;
}

export function listColors(): Promise<Color[]> {
  return request("/colors");
}

export function createColor(input: ColorInput): Promise<Color> {
  return request("/colors", { method: "POST", body: JSON.stringify(input) });
}

export function updateColor(id: string, input: Partial<ColorInput>): Promise<Color> {
  return request(`/colors/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteColor(id: string): Promise<void> {
  return request(`/colors/${id}`, { method: "DELETE" });
}

// --- Products ---

export interface AdminProductListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  category: { name: string; slug: string };
  images: { url: string }[];
  variants: { price: number }[];
}

export interface AdminProductsResponse {
  items: AdminProductListItem[];
  total: number;
  page: number;
  limit: number;
}

const adminProductVariantSchema = z.object({
  id: z.string(),
  material_id: z.string(),
  color_id: z.string(),
  size: z.string(),
  price: z.number(),
  stock_quantity: z.number(),
  sku: z.string(),
  is_active: z.boolean(),
  material: z.object({ name: z.string() }),
  color: z.object({ name: z.string(), hex_code: z.string().nullable() }),
});

const adminProductImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  alt_text: z.string().nullable(),
  sort_order: z.number(),
  is_primary: z.boolean(),
  variant_id: z.string().nullable(),
  image_role: productImageRoleSchema,
});

const adminProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  care_instructions: z.string().nullable(),
  category_id: z.string(),
  is_active: z.boolean(),
  category: z.object({ name: z.string(), slug: z.string() }),
  variants: z.array(adminProductVariantSchema),
  images: z.array(adminProductImageSchema),
});

export type AdminProductVariant = z.infer<typeof adminProductVariantSchema>;
export type AdminProductImage = z.infer<typeof adminProductImageSchema>;
export type AdminProduct = z.infer<typeof adminProductSchema>;

export interface ProductInput {
  name: string;
  slug: string;
  description?: string;
  care_instructions?: string;
  category_id: string;
}

export function getAdminProducts(): Promise<AdminProductsResponse> {
  return request("/products/admin?limit=100");
}

export function getAdminProduct(slug: string): Promise<AdminProduct> {
  return requestJson(`/products/${slug}`).then((body) => adminProductSchema.parse(body));
}

export function createProduct(input: ProductInput): Promise<AdminProduct> {
  return request("/products", { method: "POST", body: JSON.stringify(input) });
}

export function updateProduct(
  id: string,
  input: Partial<ProductInput> & { is_active?: boolean },
): Promise<AdminProduct> {
  return request(`/products/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteProduct(id: string): Promise<AdminProduct> {
  return request(`/products/${id}`, { method: "DELETE" });
}

// --- Variants ---

export interface VariantInput {
  material_id: string;
  color_id: string;
  size: string;
  price: number;
  stock_quantity: number;
  sku: string;
}

export function addVariant(productId: string, input: VariantInput): Promise<AdminProductVariant> {
  return request(`/products/${productId}/variants`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateVariant(
  id: string,
  input: Partial<VariantInput> & { is_active?: boolean },
): Promise<AdminProductVariant> {
  return request(`/variants/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteVariant(id: string): Promise<AdminProductVariant> {
  return request(`/variants/${id}`, { method: "DELETE" });
}

// --- Images ---

export interface ImageInput {
  url: string;
  public_id?: string;
  alt_text?: string;
  sort_order?: number;
  is_primary?: boolean;
  variant_id?: string;
  image_role?: ProductImageRole;
}

export function addImage(productId: string, input: ImageInput): Promise<AdminProductImage> {
  return request(`/products/${productId}/images`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteImage(id: string): Promise<void> {
  return request(`/images/${id}`, { method: "DELETE" });
}

export async function uploadImage(file: File): Promise<{ url: string; public_id: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/admin/images/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new AdminApiError(res.status, body);
  }

  return z.object({ url: z.string(), public_id: z.string() }).parse(await res.json());
}
