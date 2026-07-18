import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const updateAdminOrderStatus = vi.fn();
vi.mock("@/lib/admin-api", async () => {
  const actual = await import("@/lib/admin-api");
  return {
    ...actual,
    updateAdminOrderStatus: (...args: unknown[]) => updateAdminOrderStatus(...args),
  };
});

import { revalidatePath } from "next/cache";
import { AdminApiError } from "@/lib/admin-api";
import { updateAdminOrderStatusAction } from "./actions";

describe("order status server action", () => {
  beforeEach(() => {
    updateAdminOrderStatus.mockReset();
    vi.mocked(revalidatePath).mockClear();
  });

  it("returns the validated response and revalidates list/detail paths", async () => {
    const data = { id: "order-1", status: "PROCESSING" };
    updateAdminOrderStatus.mockResolvedValue(data);

    await expect(updateAdminOrderStatusAction("order-1", "PROCESSING")).resolves.toEqual({
      ok: true,
      data,
    });
    expect(updateAdminOrderStatus).toHaveBeenCalledWith("order-1", "PROCESSING");
    expect(revalidatePath).toHaveBeenNthCalledWith(1, "/admin/orders");
    expect(revalidatePath).toHaveBeenNthCalledWith(2, "/admin/orders/order-1");
  });

  it("surfaces API errors without revalidating", async () => {
    updateAdminOrderStatus.mockRejectedValue(new AdminApiError(400, { message: "Invalid transition" }));

    await expect(updateAdminOrderStatusAction("order-1", "DELIVERED")).resolves.toEqual({
      ok: false,
      error: "Invalid transition",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
