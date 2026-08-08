import { z } from "zod";

export const contactSubmissionResponseSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().min(1),
});

const contactErrorSchema = z.object({
  message: z.union([z.string(), z.array(z.string())]),
});

export function contactErrorMessage(payload: unknown): string {
  const parsed = contactErrorSchema.safeParse(payload);
  if (!parsed.success) return "Something went wrong. Please try again.";

  return Array.isArray(parsed.data.message)
    ? parsed.data.message.join(" ")
    : parsed.data.message;
}
