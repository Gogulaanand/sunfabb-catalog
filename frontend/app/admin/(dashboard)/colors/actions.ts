"use server";

import { revalidatePath } from "next/cache";
import {
  AdminApiError,
  createColor,
  deleteColor,
  updateColor,
  type ColorInput,
} from "@/lib/admin-api";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function createColorAction(input: ColorInput): Promise<ActionResult<void>> {
  try {
    await createColor(input);
    revalidatePath("/admin/colors");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AdminApiError ? err.message : "Failed to create color" };
  }
}

export async function updateColorAction(id: string, input: Partial<ColorInput>): Promise<ActionResult<void>> {
  try {
    await updateColor(id, input);
    revalidatePath("/admin/colors");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AdminApiError ? err.message : "Failed to update color" };
  }
}

export async function deleteColorAction(id: string): Promise<ActionResult<void>> {
  try {
    await deleteColor(id);
    revalidatePath("/admin/colors");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AdminApiError ? err.message : "Failed to delete color" };
  }
}
