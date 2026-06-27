"use server";

import { forgotPassword } from "@/lib/customer-api";

export async function requestPasswordReset(email: string): Promise<{ ok: true }> {
  return forgotPassword(email);
}
