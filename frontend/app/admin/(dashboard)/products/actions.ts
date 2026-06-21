"use server";

import { revalidatePath } from "next/cache";
import {
  AdminApiError,
  addImage,
  addVariant,
  createProduct,
  deleteImage,
  deleteProduct,
  deleteVariant,
  updateProduct,
  updateVariant,
  uploadImage,
  type ImageInput,
  type ProductInput,
  type VariantInput,
} from "@/lib/admin-api";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function toError(err: unknown, fallback: string): ActionResult<never> {
  return { ok: false, error: err instanceof AdminApiError ? err.message : fallback };
}

export async function createProductAction(input: ProductInput): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const product = await createProduct(input);
    revalidatePath("/admin/products");
    return { ok: true, data: { id: product.id, slug: product.slug } };
  } catch (err) {
    return toError(err, "Failed to create product");
  }
}

export async function updateProductAction(
  id: string,
  slug: string,
  input: Partial<ProductInput> & { is_active?: boolean },
): Promise<ActionResult<void>> {
  try {
    await updateProduct(id, input);
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${slug}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, "Failed to update product");
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult<void>> {
  try {
    await deleteProduct(id);
    revalidatePath("/admin/products");
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, "Failed to deactivate product");
  }
}

export async function addVariantAction(
  productId: string,
  slug: string,
  input: VariantInput,
): Promise<ActionResult<void>> {
  try {
    await addVariant(productId, input);
    revalidatePath(`/admin/products/${slug}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, "Failed to add variant");
  }
}

export async function updateVariantAction(
  id: string,
  slug: string,
  input: Partial<VariantInput> & { is_active?: boolean },
): Promise<ActionResult<void>> {
  try {
    await updateVariant(id, input);
    revalidatePath(`/admin/products/${slug}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, "Failed to update variant");
  }
}

export async function deleteVariantAction(id: string, slug: string): Promise<ActionResult<void>> {
  try {
    await deleteVariant(id);
    revalidatePath(`/admin/products/${slug}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, "Failed to remove variant");
  }
}

export async function uploadAndAddImageAction(
  productId: string,
  slug: string,
  file: File,
  options: Omit<ImageInput, "url">,
): Promise<ActionResult<void>> {
  try {
    const uploaded = await uploadImage(file);
    await addImage(productId, { ...options, url: uploaded.url });
    revalidatePath(`/admin/products/${slug}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, "Failed to upload image");
  }
}

export async function deleteImageAction(id: string, slug: string): Promise<ActionResult<void>> {
  try {
    await deleteImage(id);
    revalidatePath(`/admin/products/${slug}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, "Failed to delete image");
  }
}
