import "server-only";
import { cookies } from "next/headers";
import type { Category, Color, Material } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export class AdminApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(typeof body === "object" && body && "message" in body ? String((body as { message: unknown }).message) : "Request failed");
    this.status = status;
    this.body = body;
  }
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
  return res.json() as Promise<T>;
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

export interface AdminProductVariant {
  id: string;
  material_id: string;
  color_id: string;
  size: string;
  price: number;
  stock_quantity: number;
  sku: string;
  is_active: boolean;
  material: { name: string };
  color: { name: string; hex_code: string | null };
}

export interface AdminProductImage {
  id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  variant_id: string | null;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  care_instructions: string | null;
  category_id: string;
  is_active: boolean;
  category: { name: string; slug: string };
  variants: AdminProductVariant[];
  images: AdminProductImage[];
}

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
  return request(`/products/${slug}`);
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

  return res.json() as Promise<{ url: string; public_id: string }>;
}
