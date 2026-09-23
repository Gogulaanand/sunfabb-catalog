import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const createProduct = vi.fn();
const updateProduct = vi.fn();
const deleteProduct = vi.fn();
const publishProduct = vi.fn();
const restoreProduct = vi.fn();
const addVariant = vi.fn();
const updateVariant = vi.fn();
const deleteVariant = vi.fn();
const addImage = vi.fn();
const deleteImage = vi.fn();
const deleteUploadedImage = vi.fn();
const setImageCover = vi.fn();
const uploadImage = vi.fn();

vi.mock("@/lib/admin-api", async () => {
  const actual = await import("@/lib/admin-api");
  return {
    ...actual,
    createProduct: (...args: unknown[]) => createProduct(...args),
    updateProduct: (...args: unknown[]) => updateProduct(...args),
    deleteProduct: (...args: unknown[]) => deleteProduct(...args),
    publishProduct: (...args: unknown[]) => publishProduct(...args),
    restoreProduct: (...args: unknown[]) => restoreProduct(...args),
    addVariant: (...args: unknown[]) => addVariant(...args),
    updateVariant: (...args: unknown[]) => updateVariant(...args),
    deleteVariant: (...args: unknown[]) => deleteVariant(...args),
    addImage: (...args: unknown[]) => addImage(...args),
    deleteImage: (...args: unknown[]) => deleteImage(...args),
    deleteUploadedImage: (...args: unknown[]) => deleteUploadedImage(...args),
    setImageCover: (...args: unknown[]) => setImageCover(...args),
    uploadImage: (...args: unknown[]) => uploadImage(...args),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn() })),
}));

import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
  publishProductAction,
  restoreProductAction,
  addVariantAction,
  updateVariantAction,
  deleteVariantAction,
  uploadAndAddImageAction,
  deleteImageAction,
  setImageCoverAction,
} from "./actions";
import { AdminApiError } from "@/lib/admin-api";
import { revalidatePath } from "next/cache";

describe("product server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createProductAction returns the new id/slug and revalidates", async () => {
    createProduct.mockResolvedValue({ id: "1", slug: "royal-bedspread" });
    const result = await createProductAction({
      name: "x",
      slug: "royal-bedspread",
      category_id: "1",
    });

    expect(result).toEqual({
      ok: true,
      data: { id: "1", slug: "royal-bedspread" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products");
  });

  it("createProductAction surfaces AdminApiError", async () => {
    createProduct.mockRejectedValue(
      new AdminApiError(400, { message: "slug taken" }),
    );
    const result = await createProductAction({
      name: "x",
      slug: "x",
      category_id: "1",
    });
    expect(result).toEqual({ ok: false, error: "slug taken" });
  });

  it("createProductAction falls back to a generic message", async () => {
    createProduct.mockRejectedValue(new Error("boom"));
    const result = await createProductAction({
      name: "x",
      slug: "x",
      category_id: "1",
    });
    expect(result).toEqual({ ok: false, error: "Failed to create product" });
  });

  it("updateProductAction revalidates both the list and detail paths", async () => {
    updateProduct.mockResolvedValue({});
    const result = await updateProductAction("1", "royal-bedspread", {
      name: "Updated",
    });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/admin/products/royal-bedspread",
    );
  });

  it("updateProductAction surfaces failure", async () => {
    updateProduct.mockRejectedValue(
      new AdminApiError(404, { message: "not found" }),
    );
    const result = await updateProductAction("1", "x", {});
    expect(result).toEqual({ ok: false, error: "not found" });
  });

  it("rejects lifecycle flags instead of sending them through generic PATCH", async () => {
    const result = await updateProductAction(
      "1",
      "royal-bedspread",
      { is_active: true } as never,
    );

    expect(result).toEqual({
      ok: false,
      error:
        "Product lifecycle state must be changed through publish, restore, or hide actions.",
    });
    expect(updateProduct).not.toHaveBeenCalled();
  });

  it("deleteProductAction (soft delete) revalidates the list", async () => {
    deleteProduct.mockResolvedValue({});
    const result = await deleteProductAction("1");

    expect(result).toEqual({ ok: true, data: undefined });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products");
  });

  it("deleteProductAction surfaces failure with the deactivate-specific message", async () => {
    deleteProduct.mockRejectedValue(new Error("boom"));
    const result = await deleteProductAction("1");
    expect(result).toEqual({
      ok: false,
      error: "Failed to deactivate product",
    });
  });

  it("publishProductAction revalidates list and detail paths", async () => {
    publishProduct.mockResolvedValue({});
    const result = await publishProductAction("1", "royal-bedspread");

    expect(result).toEqual({ ok: true, data: undefined });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/admin/products/royal-bedspread",
    );
  });

  it("publishProductAction surfaces the backend completeness error", async () => {
    publishProduct.mockRejectedValue(
      new AdminApiError(400, { message: "add a primary gallery image" }),
    );

    await expect(publishProductAction("1", "x")).resolves.toEqual({
      ok: false,
      error: "add a primary gallery image",
    });
  });

  it("restoreProductAction revalidates list and detail paths", async () => {
    restoreProduct.mockResolvedValue({});
    const result = await restoreProductAction("1", "royal-bedspread");

    expect(result).toEqual({ ok: true, data: undefined });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/admin/products/royal-bedspread",
    );
  });

  it("addVariantAction revalidates the product detail path", async () => {
    addVariant.mockResolvedValue({});
    const result = await addVariantAction("1", "royal-bedspread", {
      material_id: "1",
      color_id: "1",
      size: "M",
      price: 100,
      stock_quantity: 1,
      sku: "SKU-1",
    });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(revalidatePath).toHaveBeenCalledWith(
      "/admin/products/royal-bedspread",
    );
  });

  it("addVariantAction surfaces failure", async () => {
    addVariant.mockRejectedValue(new Error("boom"));
    const result = await addVariantAction("1", "x", {
      material_id: "1",
      color_id: "1",
      size: "M",
      price: 100,
      stock_quantity: 1,
      sku: "SKU-1",
    });
    expect(result).toEqual({ ok: false, error: "Failed to add variant" });
  });

  it("updateVariantAction revalidates the product detail path", async () => {
    updateVariant.mockResolvedValue({});
    const result = await updateVariantAction("1", "royal-bedspread", {
      price: 200,
    });
    expect(result).toEqual({ ok: true, data: undefined });
  });

  it("updateVariantAction surfaces failure", async () => {
    updateVariant.mockRejectedValue(
      new AdminApiError(400, { message: "invalid price" }),
    );
    const result = await updateVariantAction("1", "x", { price: -1 });
    expect(result).toEqual({ ok: false, error: "invalid price" });
  });

  it("deleteVariantAction revalidates the product detail path", async () => {
    deleteVariant.mockResolvedValue({});
    const result = await deleteVariantAction("1", "royal-bedspread");
    expect(result).toEqual({ ok: true, data: undefined });
  });

  it("deleteVariantAction surfaces failure", async () => {
    deleteVariant.mockRejectedValue(new Error("boom"));
    const result = await deleteVariantAction("1", "x");
    expect(result).toEqual({ ok: false, error: "Failed to remove variant" });
  });

  it("uploadAndAddImageAction uploads then attaches the image with the returned url", async () => {
    uploadImage.mockResolvedValue({
      url: "https://cdn/x.jpg",
      public_id: "sunfabb/x",
    });
    addImage.mockResolvedValue({ id: "image-1" });
    setImageCover.mockResolvedValue({});
    const file = new File(["x"], "a.jpg");

    const result = await uploadAndAddImageAction("1", "royal-bedspread", file, {
      is_primary: true,
      variant_id: "variant-1",
      image_role: "GALLERY",
    });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(addImage).toHaveBeenCalledWith("1", {
      variant_id: "variant-1",
      image_role: "GALLERY",
      is_primary: false,
      url: "https://cdn/x.jpg",
      public_id: "sunfabb/x",
    });
    expect(setImageCover).toHaveBeenCalledWith("image-1");
  });

  it("uploadAndAddImageAction leaves a non-cover image unpromoted", async () => {
    uploadImage.mockResolvedValue({
      url: "https://cdn/x.jpg",
      public_id: "sunfabb/x",
    });
    addImage.mockResolvedValue({ id: "image-1" });

    const result = await uploadAndAddImageAction(
      "1",
      "royal-bedspread",
      new File(["x"], "a.jpg"),
      {
        is_primary: false,
      },
    );

    expect(result).toEqual({ ok: true, data: undefined });
    expect(setImageCover).not.toHaveBeenCalled();
  });

  it("uploadAndAddImageAction surfaces an upload failure without calling addImage", async () => {
    uploadImage.mockRejectedValue(
      new AdminApiError(413, { message: "file too large" }),
    );
    const result = await uploadAndAddImageAction(
      "1",
      "x",
      new File(["x"], "a.jpg"),
      {},
    );

    expect(result).toEqual({ ok: false, error: "file too large" });
    expect(addImage).not.toHaveBeenCalled();
    expect(deleteUploadedImage).not.toHaveBeenCalled();
  });

  it("removes the uploaded asset when attaching it to the product fails", async () => {
    uploadImage.mockResolvedValue({
      url: "https://cdn/x.jpg",
      public_id: "sunfabb/x",
    });
    addImage.mockRejectedValue(
      new AdminApiError(400, { message: "invalid image" }),
    );
    deleteUploadedImage.mockResolvedValue(undefined);

    const result = await uploadAndAddImageAction(
      "1",
      "royal-bedspread",
      new File(["x"], "a.jpg"),
      {},
    );

    expect(result).toEqual({ ok: false, error: "invalid image" });
    expect(deleteUploadedImage).toHaveBeenCalledWith("sunfabb/x");
    expect(deleteImage).not.toHaveBeenCalled();
  });

  it("removes the attached image when cover selection fails", async () => {
    uploadImage.mockResolvedValue({
      url: "https://cdn/x.jpg",
      public_id: "sunfabb/x",
    });
    addImage.mockResolvedValue({ id: "image-1" });
    setImageCover.mockRejectedValue(
      new AdminApiError(400, { message: "cover rejected" }),
    );
    deleteImage.mockResolvedValue(undefined);

    const result = await uploadAndAddImageAction(
      "1",
      "royal-bedspread",
      new File(["x"], "a.jpg"),
      { is_primary: true },
    );

    expect(result).toEqual({ ok: false, error: "cover rejected" });
    expect(deleteImage).toHaveBeenCalledWith("image-1");
    expect(deleteUploadedImage).not.toHaveBeenCalled();
  });

  it("preserves the attachment error when orphan cleanup also fails", async () => {
    uploadImage.mockResolvedValue({
      url: "https://cdn/x.jpg",
      public_id: "sunfabb/x",
    });
    addImage.mockRejectedValue(
      new AdminApiError(400, { message: "invalid image" }),
    );
    deleteUploadedImage.mockRejectedValue(new Error("cleanup unavailable"));

    await expect(
      uploadAndAddImageAction(
        "1",
        "royal-bedspread",
        new File(["x"], "a.jpg"),
        {},
      ),
    ).resolves.toEqual({ ok: false, error: "invalid image" });
  });

  it("deleteImageAction revalidates the product detail path", async () => {
    deleteImage.mockResolvedValue(undefined);
    const result = await deleteImageAction("1", "royal-bedspread");
    expect(result).toEqual({ ok: true, data: undefined });
  });

  it("deleteImageAction surfaces failure", async () => {
    deleteImage.mockRejectedValue(new Error("boom"));
    const result = await deleteImageAction("1", "x");
    expect(result).toEqual({ ok: false, error: "Failed to delete image" });
  });

  it("setImageCoverAction revalidates the product detail and list", async () => {
    setImageCover.mockResolvedValue({});

    await expect(
      setImageCoverAction("image-1", "royal-bedspread"),
    ).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(revalidatePath).toHaveBeenCalledWith(
      "/admin/products/royal-bedspread",
    );
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products");
  });

  it("setImageCoverAction surfaces a protected endpoint failure", async () => {
    setImageCover.mockRejectedValue(
      new AdminApiError(400, { message: "Only gallery images can be a cover" }),
    );

    await expect(
      setImageCoverAction("image-1", "royal-bedspread"),
    ).resolves.toEqual({
      ok: false,
      error: "Only gallery images can be a cover",
    });
  });
});
