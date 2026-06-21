"use server";

import { revalidatePath } from "next/cache";
import {
  AdminApiError,
  createCategory,
  deleteCategory,
  updateCategory,
  type CategoryInput,
} from "@/lib/admin-api";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function createCategoryAction(input: CategoryInput): Promise<ActionResult<void>> {
  try {
    await createCategory(input);
    revalidatePath("/admin/categories");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AdminApiError ? err.message : "Failed to create category" };
  }
}

export async function updateCategoryAction(
  id: string,
  input: Partial<CategoryInput>,
): Promise<ActionResult<void>> {
  try {
    await updateCategory(id, input);
    revalidatePath("/admin/categories");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AdminApiError ? err.message : "Failed to update category" };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult<void>> {
  try {
    await deleteCategory(id);
    revalidatePath("/admin/categories");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: err instanceof AdminApiError ? err.message : "Failed to delete category" };
  }
}
