import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const createColor = vi.fn();
const updateColor = vi.fn();
const deleteColor = vi.fn();

vi.mock("@/lib/admin-api", async () => {
  const actual = await import("@/lib/admin-api");
  return {
    ...actual,
    createColor: (...args: unknown[]) => createColor(...args),
    updateColor: (...args: unknown[]) => updateColor(...args),
    deleteColor: (...args: unknown[]) => deleteColor(...args),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: vi.fn() })) }));

import { createColorAction, updateColorAction, deleteColorAction } from "./actions";
import { AdminApiError } from "@/lib/admin-api";
import { revalidatePath } from "next/cache";

describe("color server actions", () => {
  beforeEach(() => {
    createColor.mockReset();
    updateColor.mockReset();
    deleteColor.mockReset();
    vi.mocked(revalidatePath).mockClear();
  });

  it("createColorAction returns ok and revalidates on success", async () => {
    createColor.mockResolvedValue({ id: 1 });
    const result = await createColorAction({ name: "Indigo" });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/colors");
  });

  it("createColorAction surfaces AdminApiError messages", async () => {
    createColor.mockRejectedValue(new AdminApiError(400, { message: "name already exists" }));
    const result = await createColorAction({ name: "x" });

    expect(result).toEqual({ ok: false, error: "name already exists" });
  });

  it("createColorAction falls back to a generic message for non-AdminApiError failures", async () => {
    createColor.mockRejectedValue(new Error("network down"));
    const result = await createColorAction({ name: "x" });

    expect(result).toEqual({ ok: false, error: "Failed to create color" });
  });

  it("updateColorAction returns ok and revalidates on success", async () => {
    updateColor.mockResolvedValue({ id: 1 });
    const result = await updateColorAction("1", { name: "Updated" });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(updateColor).toHaveBeenCalledWith("1", { name: "Updated" });
  });

  it("updateColorAction surfaces failure", async () => {
    updateColor.mockRejectedValue(new AdminApiError(404, { message: "not found" }));
    const result = await updateColorAction("1", { name: "x" });

    expect(result).toEqual({ ok: false, error: "not found" });
  });

  it("deleteColorAction returns ok and revalidates on success", async () => {
    deleteColor.mockResolvedValue(undefined);
    const result = await deleteColorAction("1");

    expect(result).toEqual({ ok: true, data: undefined });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/colors");
  });

  it("deleteColorAction surfaces failure", async () => {
    deleteColor.mockRejectedValue(new Error("db locked"));
    const result = await deleteColorAction("1");

    expect(result).toEqual({ ok: false, error: "Failed to delete color" });
  });
});
