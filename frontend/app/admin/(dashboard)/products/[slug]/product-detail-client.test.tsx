import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "@/components/ui/provider";
import type { AdminProduct } from "@/lib/admin-api";
import { ProductDetailClient } from "./product-detail-client";

const refreshMock = vi.fn();
const updateProductAction = vi.fn();
const publishProductAction = vi.fn();
const restoreProductAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

vi.mock("../actions", () => ({
  deleteProductAction: vi.fn(),
  updateProductAction: (...args: unknown[]) => updateProductAction(...args),
  publishProductAction: (...args: unknown[]) => publishProductAction(...args),
  restoreProductAction: (...args: unknown[]) => restoreProductAction(...args),
}));

vi.mock("./variants-section", () => ({
  VariantsSection: () => null,
}));

vi.mock("./images-section", () => ({
  ImagesSection: () => null,
}));

const categories = [
  {
    id: "category-1",
    name: "Bedspreads",
    slug: "bedspreads",
    description: null,
    image_url: null,
  },
];
const baseProduct: AdminProduct = {
  id: "product-1",
  name: "Royal Bedspread",
  slug: "royal-bedspread",
  description: "A customer-ready woven bedspread.",
  care_instructions: "Cold wash.",
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
      is_active: true,
      material: { name: "Cotton" },
      color: { name: "Red", hex_code: "#ff0000" },
    },
  ],
  images: [
    {
      id: "image-1",
      url: "https://example.com/image.jpg",
      alt_text: "Royal bedspread",
      sort_order: 0,
      is_primary: true,
      variant_id: "variant-1",
      image_role: "GALLERY",
    },
  ],
};

function renderClient(product: AdminProduct = baseProduct) {
  return render(
    <Provider>
      <ProductDetailClient
        product={product}
        categories={categories}
        materials={[]}
        colors={[]}
      />
    </Provider>,
  );
}

describe("ProductDetailClient publication controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateProductAction.mockResolvedValue({ ok: true, data: undefined });
    publishProductAction.mockResolvedValue({ ok: true, data: undefined });
    restoreProductAction.mockResolvedValue({ ok: true, data: undefined });
  });

  it("shows Draft and keeps Publish unavailable until completeness is met", () => {
    renderClient({ ...baseProduct, description: null, images: [] });

    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument();
  });

  it.each([
    ["care instructions", { care_instructions: null }],
    ["measured width", { measured_width_cm: null }],
    ["measured length", { measured_length_cm: null }],
    ["set contents", { set_contents: null }],
  ])("keeps Publish unavailable without %s", (_field, override) => {
    renderClient({ ...baseProduct, ...override });

    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });

  it("shows only Publish for a complete draft and calls the action", async () => {
    const user = userEvent.setup();
    renderClient();

    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Restore" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() =>
      expect(publishProductAction).toHaveBeenCalledWith("product-1", "royal-bedspread"),
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows only Restore for a complete hidden product and calls the action", async () => {
    const user = userEvent.setup();
    renderClient({ ...baseProduct, published_at: "2026-07-18T08:30:00.000Z" });

    expect(screen.getByText("Hidden")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() =>
      expect(restoreProductAction).toHaveBeenCalledWith("product-1", "royal-bedspread"),
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("sends null for cleared nullable text and shows save confirmation", async () => {
    const user = userEvent.setup();
    renderClient();

    const textboxes = screen.getAllByRole("textbox");
    await user.clear(textboxes[2]);
    await user.clear(textboxes[3]);
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateProductAction).toHaveBeenCalledWith("product-1", "royal-bedspread", {
        name: "Royal Bedspread",
        slug: "royal-bedspread",
        description: null,
        care_instructions: null,
        measured_width_cm: 240,
        measured_length_cm: 260,
        set_contents: "1 bedspread and 1 pillow cover",
        category_id: "category-1",
      }),
    );
    expect(await screen.findByText("Changes saved. The detail view has been refreshed.")).toBeInTheDocument();
  });
});
