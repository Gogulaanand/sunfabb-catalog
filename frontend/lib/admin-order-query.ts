import { z } from "zod";
import type { AdminOrdersQuery } from "./admin-api";
import { adminOrderStatusSchema } from "./admin-order-status";

type RawAdminOrdersQuery = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseInteger(value: string | undefined, max?: number): number | undefined {
  const parsed = z.coerce.number().int().min(1).safeParse(value);
  if (!parsed.success || (max !== undefined && parsed.data > max)) return undefined;
  return parsed.data;
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const dateOnlySchema = z.string().refine(isValidDateOnly);

const adminOrdersQuerySchema = z
  .object({
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    status: adminOrderStatusSchema.optional(),
    date_from: dateOnlySchema.optional(),
    date_to: dateOnlySchema.optional(),
  })
  .superRefine((query, context) => {
    if (query.date_from && query.date_to && query.date_from > query.date_to) {
      context.addIssue({
        code: "custom",
        path: ["date_to"],
        message: "date_to must be on or after date_from",
      });
    }
  });

export function parseAdminOrdersQuery(raw: RawAdminOrdersQuery): AdminOrdersQuery {
  const candidate = {
    page: parseInteger(first(raw.page)),
    limit: parseInteger(first(raw.limit), 100),
    status: adminOrderStatusSchema.safeParse(first(raw.status)).data,
    date_from: dateOnlySchema.safeParse(first(raw.date_from)).data,
    date_to: dateOnlySchema.safeParse(first(raw.date_to)).data,
  };

  const compactCandidate = Object.fromEntries(
    Object.entries(candidate).filter(([, value]) => value !== undefined),
  );
  const parsed = adminOrdersQuerySchema.safeParse(compactCandidate);
  return parsed.success ? parsed.data : {};
}
