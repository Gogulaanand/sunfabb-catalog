"use server";

import { revalidatePath } from "next/cache";
import {
  AdminApiError,
  createMaterial,
  deleteMaterial,
  updateMaterial,
  type MaterialInput,
} from "@/lib/admin-api";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function createMaterialAction(input: MaterialInput): Promise<ActionResult<void>> {
  try {
    await createMaterial(input);
    revalidatePath("/admin/materials");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AdminApiError ? err.message : "Failed to create material" };
  }
}

export async function updateMaterialAction(
  id: string,
  input: Partial<MaterialInput>,
): Promise<ActionResult<void>> {
  try {
    await updateMaterial(id, input);
    revalidatePath("/admin/materials");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AdminApiError ? err.message : "Failed to update material" };
  }
}

export async function deleteMaterialAction(id: string): Promise<ActionResult<void>> {
  try {
    await deleteMaterial(id);
    revalidatePath("/admin/materials");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AdminApiError ? err.message : "Failed to delete material" };
  }
}
