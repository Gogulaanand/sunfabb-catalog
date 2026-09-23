import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "@/components/ui/provider";
import type { AdminProduct } from "@/lib/admin-api";
import { ImagesSection } from "./images-section";

const refreshMock = vi.fn();
const setImageCoverAction = vi.fn();
const deleteImageAction = vi.fn();
const uploadAndAddImageAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("../actions", () => ({
  setImageCoverAction: (...args: unknown[]) => setImageCoverAction(...args),
  deleteImageAction: (...args: unknown[]) => deleteImageAction(...args),
  uploadAndAddImageAction: (...args: unknown[]) =>
    uploadAndAddImageAction(...args),
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
      is_active: true,
      material: { name: "Cotton" },
      color: { name: "Red", hex_code: "#ff0000" },
    },
  ],
  images: [
    {
      id: "image-1",
      url: "https://example.com/cover.jpg",
      alt_text: "Cover",
      sort_order: 0,
      is_primary: true,
      variant_id: null,
      image_role: "GALLERY",
    },
    {
      id: "image-2",
      url: "https://example.com/alternate.jpg",
      alt_text: "Alternate",
      sort_order: 1,
      is_primary: false,
      variant_id: null,
      image_role: "GALLERY",
    },
    {
      id: "image-3",
      url: "https://example.com/swatch.jpg",
      alt_text: "Swatch",
      sort_order: 2,
      is_primary: false,
      variant_id: "variant-1",
      image_role: "SWATCH",
    },
  ],
};

describe("ImagesSection cover controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setImageCoverAction.mockResolvedValue({ ok: true, data: undefined });
    deleteImageAction.mockResolvedValue({ ok: true, data: undefined });
    uploadAndAddImageAction.mockResolvedValue({ ok: true, data: undefined });
  });

  it("offers Make cover only for non-primary gallery images and refreshes after success", async () => {
    const user = userEvent.setup();
    render(
      <Provider>
        <ImagesSection product={product} />
      </Provider>,
    );

    expect(screen.getAllByRole("button", { name: "Make cover" })).toHaveLength(
      1,
    );
    await user.click(screen.getByRole("button", { name: "Make cover" }));

    await waitFor(() =>
      expect(setImageCoverAction).toHaveBeenCalledWith(
        "image-2",
        "royal-bedspread",
      ),
    );
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("does not offer Make cover for swatches", () => {
    render(
      <Provider>
        <ImagesSection product={{ ...product, images: [product.images[2]] }} />
      </Provider>,
    );

    expect(
      screen.queryByRole("button", { name: "Make cover" }),
    ).not.toBeInTheDocument();
  });
});
