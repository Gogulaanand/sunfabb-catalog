import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const createCategory = vi.fn();
const updateCategory = vi.fn();
const deleteCategory = vi.fn();

vi.mock("@/lib/admin-api", async () => {
  const actual = await import("@/lib/admin-api");
  return {
    ...actual,
    createCategory: (...args: unknown[]) => createCategory(...args),
    updateCategory: (...args: unknown[]) => updateCategory(...args),
    deleteCategory: (...args: unknown[]) => deleteCategory(...args),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: vi.fn() })) }));

import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from "./actions";
import { AdminApiError } from "@/lib/admin-api";
import { revalidatePath } from "next/cache";

describe("category server actions", () => {
  beforeEach(() => {
    createCategory.mockReset();
    updateCategory.mockReset();
    deleteCategory.mockReset();
    vi.mocked(revalidatePath).mockClear();
  });

  it("createCategoryAction returns ok and revalidates on success", async () => {
    createCategory.mockResolvedValue({ id: 1 });
    const result = await createCategoryAction({ name: "Bedspreads", slug: "bedspreads" });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/categories");
  });

  it("createCategoryAction surfaces AdminApiError messages", async () => {
    createCategory.mockRejectedValue(new AdminApiError(400, { message: "slug already exists" }));
    const result = await createCategoryAction({ name: "x", slug: "x" });

    expect(result).toEqual({ ok: false, error: "slug already exists" });
  });

  it("createCategoryAction falls back to a generic message for non-AdminApiError failures", async () => {
    createCategory.mockRejectedValue(new Error("network down"));
    const result = await createCategoryAction({ name: "x", slug: "x" });

    expect(result).toEqual({ ok: false, error: "Failed to create category" });
  });

  it("updateCategoryAction returns ok and revalidates on success", async () => {
    updateCategory.mockResolvedValue({ id: 1 });
    const result = await updateCategoryAction("1", { name: "Updated" });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(updateCategory).toHaveBeenCalledWith("1", { name: "Updated" });
  });

  it("updateCategoryAction surfaces failure", async () => {
    updateCategory.mockRejectedValue(new AdminApiError(404, { message: "not found" }));
    const result = await updateCategoryAction("1", { name: "x" });

    expect(result).toEqual({ ok: false, error: "not found" });
  });

  it("deleteCategoryAction returns ok and revalidates on success", async () => {
    deleteCategory.mockResolvedValue(undefined);
    const result = await deleteCategoryAction("1");

    expect(result).toEqual({ ok: true, data: undefined });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/categories");
  });

  it("deleteCategoryAction surfaces failure", async () => {
    deleteCategory.mockRejectedValue(new Error("db locked"));
    const result = await deleteCategoryAction("1");

    expect(result).toEqual({ ok: false, error: "Failed to delete category" });
  });
});
