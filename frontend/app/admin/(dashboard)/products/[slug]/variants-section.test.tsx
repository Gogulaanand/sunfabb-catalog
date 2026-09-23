import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "@/components/ui/provider";
import type { AdminProduct } from "@/lib/admin-api";
import { VariantsSection } from "./variants-section";

const refreshMock = vi.fn();
const updateVariantAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("../actions", () => ({
  addVariantAction: vi.fn(),
  deleteVariantAction: vi.fn(),
  updateVariantAction: (...args: unknown[]) => updateVariantAction(...args),
}));

const product: AdminProduct = {
  id: "product-1",
  name: "Royal Bedspread",
  slug: "royal-bedspread",
  description: "A customer-ready woven bedspread.",
  care_instructions: null,
  measured_width_cm: 240,
  measured_length_cm: 260,
  set_contents: "1 bedspread and 1 pillow cover",
  category_id: "category-1",
  is_active: false,
  published_at: null,
  category: { name: "Bedspreads", slug: "bedspreads" },
  variants: [
    {
      id: "variant-1",
      material_id: "material-1",
      color_id: "color-1",
      size: "Queen",
      price: 125000,
      stock_quantity: 4,
      sku: "BSP-QUEEN-RED",
      is_active: false,
      material: { name: "Cotton" },
      color: { name: "Red", hex_code: "#ff0000" },
    },
  ],
  images: [],
};

describe("VariantsSection restore controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateVariantAction.mockResolvedValue({ ok: true, data: undefined });
  });

  it("restores an inactive variant and refreshes the product", async () => {
    const user = userEvent.setup();
    render(
      <Provider>
        <VariantsSection product={product} materials={[]} colors={[]} />
      </Provider>,
    );

    await user.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() =>
      expect(updateVariantAction).toHaveBeenCalledWith("variant-1", "royal-bedspread", {
        is_active: true,
      }),
    );
    expect(refreshMock).toHaveBeenCalled();
  });
});
