import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const createMaterial = vi.fn();
const updateMaterial = vi.fn();
const deleteMaterial = vi.fn();

vi.mock("@/lib/admin-api", async () => {
  const actual = await import("@/lib/admin-api");
  return {
    ...actual,
    createMaterial: (...args: unknown[]) => createMaterial(...args),
    updateMaterial: (...args: unknown[]) => updateMaterial(...args),
    deleteMaterial: (...args: unknown[]) => deleteMaterial(...args),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: vi.fn() })) }));

import { createMaterialAction, updateMaterialAction, deleteMaterialAction } from "./actions";
import { AdminApiError } from "@/lib/admin-api";
import { revalidatePath } from "next/cache";

describe("material server actions", () => {
  beforeEach(() => {
    createMaterial.mockReset();
    updateMaterial.mockReset();
    deleteMaterial.mockReset();
    vi.mocked(revalidatePath).mockClear();
  });

  it("createMaterialAction returns ok and revalidates on success", async () => {
    createMaterial.mockResolvedValue({ id: 1 });
    const result = await createMaterialAction({ name: "Cotton" });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/materials");
  });

  it("createMaterialAction surfaces AdminApiError messages", async () => {
    createMaterial.mockRejectedValue(new AdminApiError(400, { message: "name already exists" }));
    const result = await createMaterialAction({ name: "x" });

    expect(result).toEqual({ ok: false, error: "name already exists" });
  });

  it("createMaterialAction falls back to a generic message for non-AdminApiError failures", async () => {
    createMaterial.mockRejectedValue(new Error("network down"));
    const result = await createMaterialAction({ name: "x" });

    expect(result).toEqual({ ok: false, error: "Failed to create material" });
  });

  it("updateMaterialAction returns ok and revalidates on success", async () => {
    updateMaterial.mockResolvedValue({ id: 1 });
    const result = await updateMaterialAction("1", { name: "Updated" });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(updateMaterial).toHaveBeenCalledWith("1", { name: "Updated" });
  });

  it("updateMaterialAction surfaces failure", async () => {
    updateMaterial.mockRejectedValue(new AdminApiError(404, { message: "not found" }));
    const result = await updateMaterialAction("1", { name: "x" });

    expect(result).toEqual({ ok: false, error: "not found" });
  });

  it("deleteMaterialAction returns ok and revalidates on success", async () => {
    deleteMaterial.mockResolvedValue(undefined);
    const result = await deleteMaterialAction("1");

    expect(result).toEqual({ ok: true, data: undefined });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/materials");
  });

  it("deleteMaterialAction surfaces failure", async () => {
    deleteMaterial.mockRejectedValue(new Error("db locked"));
    const result = await deleteMaterialAction("1");

    expect(result).toEqual({ ok: false, error: "Failed to delete material" });
  });
});
