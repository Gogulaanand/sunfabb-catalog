"use server";

import { revalidatePath } from "next/cache";
import {
  AdminApiError,
  addImage,
  addVariant,
  createProduct,
  deleteImage,
  deleteUploadedImage,
  deleteProduct,
  deleteVariant,
  updateProduct,
  updateVariant,
  uploadImage,
  publishProduct,
  restoreProduct,
  setImageCover,
  type ImageInput,
  type ProductInput,
  type VariantInput,
} from "@/lib/admin-api";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function toError(err: unknown, fallback: string): ActionResult<never> {
  return {
    ok: false,
    error: err instanceof AdminApiError ? err.message : fallback,
  };
}

export async function createProductAction(
  input: ProductInput,
): Promise<ActionResult<{ id: string; slug: string }>> {
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
  input: Partial<ProductInput>,
): Promise<ActionResult<void>> {
  try {
    const rawInput = input as unknown as Record<string, unknown>;
    if ('is_active' in rawInput || 'published_at' in rawInput) {
      return {
        ok: false,
        error:
          "Product lifecycle state must be changed through publish, restore, or hide actions.",
      };
    }

    await updateProduct(id, input);
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${slug}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, "Failed to update product");
  }
}

export async function deleteProductAction(
  id: string,
  slug?: string,
): Promise<ActionResult<void>> {
  try {
    await deleteProduct(id);
    revalidatePath("/admin/products");
    if (slug) revalidatePath(`/admin/products/${slug}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, "Failed to deactivate product");
  }
}

export async function publishProductAction(
  id: string,
  slug: string,
): Promise<ActionResult<void>> {
  try {
    await publishProduct(id);
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${slug}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, "Failed to publish product");
  }
}

export async function restoreProductAction(
  id: string,
  slug: string,
): Promise<ActionResult<void>> {
  try {
    await restoreProduct(id);
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${slug}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, "Failed to restore product");
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

export async function deleteVariantAction(
  id: string,
  slug: string,
): Promise<ActionResult<void>> {
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
  options: Omit<ImageInput, "url" | "public_id">,
): Promise<ActionResult<void>> {
  try {
    const uploaded = await uploadImage(file);
    const { is_primary: wantsCover, ...imageOptions } = options;
    let image: Awaited<ReturnType<typeof addImage>>;
    try {
      image = await addImage(productId, {
        ...imageOptions,
        is_primary: false,
        url: uploaded.url,
        public_id: uploaded.public_id,
      });
    } catch (err) {
      try {
        await deleteUploadedImage(uploaded.public_id);
      } catch {
        // Preserve the database attachment error. The orphan can be retried
        // independently if Cloudinary cleanup is temporarily unavailable.
      }
      throw err;
    }

    if (wantsCover) {
      try {
        await setImageCover(image.id);
      } catch (err) {
        try {
          // This existing endpoint removes the database row first and then
          // destroys its Cloudinary asset without masking a committed delete.
          await deleteImage(image.id);
        } catch {
          // If rollback fails, retain both records rather than deleting the
          // asset while the database may still reference it.
        }
        throw err;
      }
    }
    revalidatePath(`/admin/products/${slug}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, "Failed to upload image");
  }
}

export async function setImageCoverAction(
  id: string,
  slug: string,
): Promise<ActionResult<void>> {
  try {
    await setImageCover(id);
    revalidatePath(`/admin/products/${slug}`);
    revalidatePath("/admin/products");
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, "Failed to make image the cover");
  }
}

export async function deleteImageAction(
  id: string,
  slug: string,
): Promise<ActionResult<void>> {
  try {
    await deleteImage(id);
    revalidatePath(`/admin/products/${slug}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return toError(err, "Failed to delete image");
  }
}
