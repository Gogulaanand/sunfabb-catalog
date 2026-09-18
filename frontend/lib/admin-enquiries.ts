import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { AdminApiError } from "./admin-api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const adminEnquirySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string(),
  email: z.string().email().nullable(),
  message: z.string(),
  created_at: z.string().datetime(),
});

export const adminEnquiriesResponseSchema = z.object({
  enquiries: z.array(adminEnquirySchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

export type AdminEnquiry = z.infer<typeof adminEnquirySchema>;
export type AdminEnquiriesResponse = z.infer<typeof adminEnquiriesResponseSchema>;

export interface AdminEnquiriesQuery {
  page?: number;
  limit?: number;
}

type RawAdminEnquiriesQuery = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseInteger(value: string | undefined, max?: number): number | undefined {
  const parsed = z.coerce.number().int().min(1).safeParse(value);
  if (!parsed.success || (max !== undefined && parsed.data > max)) return undefined;
  return parsed.data;
}

export function parseAdminEnquiriesQuery(raw: RawAdminEnquiriesQuery): AdminEnquiriesQuery {
  const page = parseInteger(first(raw.page));
  const limit = parseInteger(first(raw.limit), 100);
  return {
    ...(page === undefined ? {} : { page }),
    ...(limit === undefined ? {} : { limit }),
  };
}

async function requestJson(path: string): Promise<unknown> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }));
    throw new AdminApiError(response.status, body);
  }

  return response.json();
}

export function listAdminEnquiries(
  params: AdminEnquiriesQuery = {},
): Promise<AdminEnquiriesResponse> {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return requestJson(`/admin/enquiries${query ? `?${query}` : ""}`).then((body) =>
    adminEnquiriesResponseSchema.parse(body),
  );
}
