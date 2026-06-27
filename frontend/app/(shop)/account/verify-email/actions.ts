"use server";

import { CustomerApiError, verifyEmail } from "@/lib/customer-api";

export async function confirmEmailVerification(
  token: string,
): Promise<{ verified: true } | { error: string }> {
  try {
    return await verifyEmail(token);
  } catch (error) {
    if (error instanceof CustomerApiError) {
      return { error: error.message };
    }
    return { error: "Could not verify your email." };
  }
}
