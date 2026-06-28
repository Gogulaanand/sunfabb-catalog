import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export class CustomerApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(typeof body === "object" && body && "message" in body ? String((body as { message: unknown }).message) : "Request failed");
    this.status = status;
    this.body = body;
  }
}

const safeCustomerSchema = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string().nullable(),
  phone: z.string().nullable(),
  email_verified: z.boolean(),
});

const authResultSchema = z.object({
  access_token: z.string(),
  customer: safeCustomerSchema,
});

const addressSchema = z.object({
  id: z.string(),
  customer_id: z.string(),
  full_name: z.string(),
  phone: z.string(),
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  country: z.string(),
  is_default: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

const okSchema = z.object({ ok: z.literal(true) });

export type SafeCustomer = z.infer<typeof safeCustomerSchema>;
export type AuthResult = z.infer<typeof authResultSchema>;
export type Address = z.infer<typeof addressSchema>;

export interface RegisterInput {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AddressInput {
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  is_default?: boolean;
}

async function authHeaders(): Promise<HeadersInit> {
  const cookieStore = await cookies();
  const token = cookieStore.get("customer_token")?.value;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new CustomerApiError(res.status, body);
  }

  return schema.parse(await res.json());
}

// --- Auth ---

export function register(input: RegisterInput): Promise<AuthResult> {
  return request("/auth/customer/register", authResultSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: LoginInput): Promise<AuthResult> {
  return request("/auth/customer/login", authResultSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function logout(): Promise<{ ok: true }> {
  return request("/auth/customer/logout", okSchema, { method: "POST" });
}

export function me(): Promise<SafeCustomer> {
  return request("/auth/customer/me", safeCustomerSchema);
}

export function verifyEmail(token: string): Promise<{ verified: true }> {
  return request(
    "/auth/customer/verify-email",
    z.object({ verified: z.literal(true) }),
    { method: "POST", body: JSON.stringify({ token }) },
  );
}

export function forgotPassword(email: string): Promise<{ ok: true }> {
  return request("/auth/customer/forgot-password", okSchema, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, password: string): Promise<{ ok: true }> {
  return request("/auth/customer/reset-password", okSchema, {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

// --- Addresses ---

export function listAddresses(): Promise<Address[]> {
  return request("/me/addresses", z.array(addressSchema));
}

export function createAddress(input: AddressInput): Promise<Address> {
  return request("/me/addresses", addressSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAddress(id: string, input: Partial<AddressInput>): Promise<Address> {
  return request(`/me/addresses/${id}`, addressSchema, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAddress(id: string): Promise<{ ok: true }> {
  return request(`/me/addresses/${id}`, okSchema, { method: "DELETE" });
}

// --- Cart ---

const cartVariantSchema = z.object({
  id: z.string(),
  size: z.string(),
  price: z.number().int(),
  stock_quantity: z.number().int(),
  sku: z.string(),
  is_active: z.boolean(),
  product: z.object({ id: z.string(), name: z.string(), slug: z.string() }),
  material: z.object({ name: z.string() }),
  color: z.object({ name: z.string(), hex_code: z.string().nullable() }),
});

const cartItemSchema = z.object({
  id: z.string(),
  cart_id: z.string(),
  variant_id: z.string(),
  quantity: z.number().int(),
  variant: cartVariantSchema,
});

const cartSchema = z.object({
  id: z.string(),
  customer_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  items: z.array(cartItemSchema),
});

export type CartVariant = z.infer<typeof cartVariantSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type Cart = z.infer<typeof cartSchema>;

export function getCart(): Promise<Cart> {
  return request("/me/cart", cartSchema);
}

export function addCartItem(variantId: string, quantity: number): Promise<Cart> {
  return request("/me/cart/items", cartSchema, {
    method: "POST",
    body: JSON.stringify({ variantId, quantity }),
  });
}

export function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  return request(`/me/cart/items/${itemId}`, cartSchema, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export function removeCartItem(itemId: string): Promise<{ ok: true }> {
  return request(`/me/cart/items/${itemId}`, okSchema, { method: "DELETE" });
}

export function mergeCart(items: { variantId: string; quantity: number }[]): Promise<Cart> {
  return request("/me/cart/merge", cartSchema, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}
