"use server";

import { CustomerApiError, resetPassword } from "@/lib/customer-api";

export async function submitPasswordReset(
  token: string,
  password: string,
): Promise<{ ok: true } | { error: string }> {
  try {
    return await resetPassword(token, password);
  } catch (error) {
    if (error instanceof CustomerApiError) {
      return { error: error.message };
    }
    return { error: "Could not reset your password." };
  }
}
