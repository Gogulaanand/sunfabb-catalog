import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const createProduct = vi.fn();
const updateProduct = vi.fn();
const deleteProduct = vi.fn();
const addVariant = vi.fn();
const updateVariant = vi.fn();
const deleteVariant = vi.fn();
const addImage = vi.fn();
const deleteImage = vi.fn();
const uploadImage = vi.fn();

vi.mock("@/lib/admin-api", async () => {
  const actual = await import("@/lib/admin-api");
  return {
    ...actual,
    createProduct: (...args: unknown[]) => createProduct(...args),
    updateProduct: (...args: unknown[]) => updateProduct(...args),
    deleteProduct: (...args: unknown[]) => deleteProduct(...args),
    addVariant: (...args: unknown[]) => addVariant(...args),
    updateVariant: (...args: unknown[]) => updateVariant(...args),
    deleteVariant: (...args: unknown[]) => deleteVariant(...args),
    addImage: (...args: unknown[]) => addImage(...args),
    deleteImage: (...args: unknown[]) => deleteImage(...args),
    uploadImage: (...args: unknown[]) => uploadImage(...args),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: vi.fn() })) }));

import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
  addVariantAction,
  updateVariantAction,
  deleteVariantAction,
  uploadAndAddImageAction,
  deleteImageAction,
} from "./actions";
import { AdminApiError } from "@/lib/admin-api";
import { revalidatePath } from "next/cache";

describe("product server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createProductAction returns the new id/slug and revalidates", async () => {
    createProduct.mockResolvedValue({ id: "1", slug: "royal-bedspread" });
    const result = await createProductAction({ name: "x", slug: "royal-bedspread", category_id: "1" });

    expect(result).toEqual({ ok: true, data: { id: "1", slug: "royal-bedspread" } });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products");
  });

  it("createProductAction surfaces AdminApiError", async () => {
    createProduct.mockRejectedValue(new AdminApiError(400, { message: "slug taken" }));
    const result = await createProductAction({ name: "x", slug: "x", category_id: "1" });
    expect(result).toEqual({ ok: false, error: "slug taken" });
  });

  it("createProductAction falls back to a generic message", async () => {
    createProduct.mockRejectedValue(new Error("boom"));
    const result = await createProductAction({ name: "x", slug: "x", category_id: "1" });
    expect(result).toEqual({ ok: false, error: "Failed to create product" });
  });

  it("updateProductAction revalidates both the list and detail paths", async () => {
    updateProduct.mockResolvedValue({});
    const result = await updateProductAction("1", "royal-bedspread", { name: "Updated" });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products/royal-bedspread");
  });

  it("updateProductAction surfaces failure", async () => {
    updateProduct.mockRejectedValue(new AdminApiError(404, { message: "not found" }));
    const result = await updateProductAction("1", "x", {});
    expect(result).toEqual({ ok: false, error: "not found" });
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
    expect(result).toEqual({ ok: false, error: "Failed to deactivate product" });
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
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products/royal-bedspread");
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
    const result = await updateVariantAction("1", "royal-bedspread", { price: 200 });
    expect(result).toEqual({ ok: true, data: undefined });
  });

  it("updateVariantAction surfaces failure", async () => {
    updateVariant.mockRejectedValue(new AdminApiError(400, { message: "invalid price" }));
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
    uploadImage.mockResolvedValue({ url: "https://cdn/x.jpg", public_id: "x" });
    addImage.mockResolvedValue({});
    const file = new File(["x"], "a.jpg");

    const result = await uploadAndAddImageAction("1", "royal-bedspread", file, {
      is_primary: true,
      variant_id: "variant-1",
      image_role: "SWATCH",
    });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(addImage).toHaveBeenCalledWith("1", {
      is_primary: true,
      variant_id: "variant-1",
      image_role: "SWATCH",
      url: "https://cdn/x.jpg",
      public_id: "x",
    });
  });

  it("uploadAndAddImageAction surfaces an upload failure without calling addImage", async () => {
    uploadImage.mockRejectedValue(new AdminApiError(413, { message: "file too large" }));
    const result = await uploadAndAddImageAction("1", "x", new File(["x"], "a.jpg"), {});

    expect(result).toEqual({ ok: false, error: "file too large" });
    expect(addImage).not.toHaveBeenCalled();
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
});
