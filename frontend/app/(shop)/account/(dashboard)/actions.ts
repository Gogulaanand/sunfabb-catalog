"use server";

import { revalidatePath } from "next/cache";
import {
  type AddressInput,
  CustomerApiError,
  createAddress as createAddressApi,
  deleteAddress as deleteAddressApi,
  updateAddress as updateAddressApi,
} from "@/lib/customer-api";

type ActionResult = { ok: true } | { error: string };

function toActionResult(error: unknown): { error: string } {
  if (error instanceof CustomerApiError) {
    return { error: error.message };
  }
  return { error: "Something went wrong. Please try again." };
}

export async function createAddressAction(input: AddressInput): Promise<ActionResult> {
  try {
    await createAddressApi(input);
    revalidatePath("/account");
    return { ok: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function updateAddressAction(
  id: string,
  input: Partial<AddressInput>,
): Promise<ActionResult> {
  try {
    await updateAddressApi(id, input);
    revalidatePath("/account");
    return { ok: true };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  try {
    await deleteAddressApi(id);
    revalidatePath("/account");
    return { ok: true };
  } catch (error) {
    return toActionResult(error);
  }
}
