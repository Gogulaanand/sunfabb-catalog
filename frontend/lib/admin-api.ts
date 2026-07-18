import "server-only";
import { cookies } from "next/headers";
import { productImageRoleSchema, type Category, type Color, type Material, type ProductImageRole } from "./api";
import { z } from "zod";
import { adminOrderStatusSchema, type AdminOrderStatus } from "./admin-order-status";

export { adminOrderStatusSchema } from "./admin-order-status";
export type { AdminOrderStatus } from "./admin-order-status";

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

// --- Orders ---

const adminOrderCustomerSchema = z.object({
  full_name: z.string().nullable(),
  email: z.string().email(),
  phone: z.string().nullable(),
});

const adminAddressSnapshotSchema = z.object({
  full_name: z.string(),
  phone: z.string(),
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  country: z.string(),
});

const adminOrderListItemSchema = z.object({
  id: z.string().uuid(),
  order_number: z.string(),
  status: adminOrderStatusSchema,
  customer: adminOrderCustomerSchema.pick({ full_name: true, email: true }),
  total_paise: z.number().int(),
  created_at: z.string().datetime(),
  item_count: z.number().int().nonnegative(),
});

const adminOrderItemSchema = z.object({
  id: z.string().uuid(),
  variant_id: z.string().uuid(),
  product_name: z.string(),
  variant_label: z.string(),
  sku: z.string(),
  hsn_code: z.string().nullable(),
  unit_price_paise: z.number().int(),
  quantity: z.number().int().positive(),
  tax_rate_bps: z.number().int().nonnegative(),
  cgst_paise: z.number().int().nonnegative(),
  sgst_paise: z.number().int().nonnegative(),
  igst_paise: z.number().int().nonnegative(),
  line_total_paise: z.number().int(),
});

const adminPaymentSchema = z.object({
  id: z.string().uuid(),
  razorpay_payment_id: z.string().nullable(),
  razorpay_order_id: z.string().nullable(),
  amount_paise: z.number().int(),
  status: z.enum([
    "CREATED",
    "AUTHORIZED",
    "CAPTURED",
    "FAILED",
    "REFUNDED",
    "PARTIALLY_REFUNDED",
  ]),
  method: z.string().nullable(),
  refunded_paise: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const adminShipmentSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  shiprocket_order_id: z.string().nullable(),
  awb_code: z.string().nullable(),
  courier_name: z.string().nullable(),
  label_url: z.string().nullable(),
  tracking_url: z.string().nullable(),
  status: z.string().nullable(),
  shipped_at: z.string().datetime().nullable(),
  delivered_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const adminOrderDetailSchema = z.object({
  id: z.string().uuid(),
  order_number: z.string(),
  customer_id: z.string().uuid(),
  status: adminOrderStatusSchema,
  email: z.string().email(),
  subtotal_paise: z.number().int(),
  shipping_paise: z.number().int(),
  tax_paise: z.number().int(),
  discount_paise: z.number().int(),
  total_paise: z.number().int(),
  currency: z.literal("INR"),
  shipping_address: adminAddressSnapshotSchema,
  billing_address: adminAddressSnapshotSchema.nullable(),
  razorpay_order_id: z.string().nullable(),
  razorpay_payment_id: z.string().nullable(),
  invoice_number: z.string().nullable(),
  placed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  customer: adminOrderCustomerSchema,
  items: z.array(adminOrderItemSchema),
  payments: z.array(adminPaymentSchema),
  shipment: adminShipmentSchema.nullable(),
  allowed_next_statuses: z.array(adminOrderStatusSchema),
});

const adminOrdersResponseSchema = z.object({
  orders: z.array(adminOrderListItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

export type AdminOrderListItem = z.infer<typeof adminOrderListItemSchema>;
export type AdminOrdersResponse = z.infer<typeof adminOrdersResponseSchema>;
export type AdminOrderDetail = z.infer<typeof adminOrderDetailSchema>;

export interface AdminOrdersQuery {
  page?: number;
  limit?: number;
  status?: AdminOrderStatus;
  date_from?: string;
  date_to?: string;
}

export function listAdminOrders(params: AdminOrdersQuery = {}): Promise<AdminOrdersResponse> {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return requestJson(`/admin/orders${query ? `?${query}` : ""}`).then((body) =>
    adminOrdersResponseSchema.parse(body),
  );
}

export function getAdminOrder(id: string): Promise<AdminOrderDetail> {
  return requestJson(`/admin/orders/${id}`).then((body) => adminOrderDetailSchema.parse(body));
}

export function updateAdminOrderStatus(
  id: string,
  status: AdminOrderStatus,
): Promise<AdminOrderDetail> {
  return requestJson(`/admin/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }).then((body) => adminOrderDetailSchema.parse(body));
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
