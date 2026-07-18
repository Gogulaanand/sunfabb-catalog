/* eslint-disable @next/next/no-img-element */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ProductImage, ProductVariant } from "@/lib/api";
import { getInitialVariantId } from "./product-gallery-utils";
import { ProductDetailInteractive } from "./ProductDetailInteractive";

// AnimatePresence mode="wait" defers child mounting until exit animations complete,
// which never happens in JSDOM (no rAF). Mock it as a passthrough so React's
// key-based reconciliation handles unmount/mount synchronously in tests.
vi.mock("motion/react", async () => {
  const actual = await vi.importActual<typeof import("motion/react")>("motion/react");
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock("next/image", () => ({
  default: (props: {
    src: string;
    alt: string;
    className?: string;
    "data-testid"?: string;
  }) => <img src={props.src} alt={props.alt} className={props.className} data-testid={props["data-testid"]} />,
}));

const variants: ProductVariant[] = [
  {
    id: "variant-red",
    size: "Queen",
    price: 100000,
    stock_quantity: 5,
    material: { name: "Cotton" },
    color: { name: "Red", hex_code: "#ff0000" },
  },
  {
    id: "variant-blue",
    size: "Queen",
    price: 110000,
    stock_quantity: 5,
    material: { name: "Cotton" },
    color: { name: "Blue", hex_code: "#0000ff" },
  },
];

function makeGalleryImages(): ProductImage[] {
  const galleryImages: ProductImage[] = variants.flatMap((variant, variantIndex) =>
    Array.from({ length: 4 }, (_, imageIndex) => ({
      id: `${variant.id}-image-${imageIndex}`,
      url: `https://example.com/${variant.id}-${imageIndex}.jpg`,
      alt_text: `${variant.color.name} ${imageIndex === 0 ? "hero" : `photo ${imageIndex}`}`,
      is_primary: variantIndex === 0 && imageIndex === 0,
      sort_order: imageIndex,
      variant_id: variant.id,
      image_role: "GALLERY" as const,
    })),
  );

  return galleryImages.concat([
    {
      id: "red-swatch",
      url: "https://example.com/red-swatch.jpg",
      alt_text: "Red swatch",
      is_primary: false,
      sort_order: 0,
      variant_id: "variant-red",
      image_role: "SWATCH" as const,
    },
  ]);
}

describe("ProductDetailInteractive", () => {
  it("initially selects the variant linked to the primary gallery image", () => {
    const images = makeGalleryImages();
    const initialVariantId = getInitialVariantId(variants, images);

    render(
      <ProductDetailInteractive
        images={images}
        variants={variants}
        productName="Variant-aware bedspread"
        productSlug="variant-aware-bedspread"
        initialVariantId={initialVariantId}
        detailsBeforeVariant={<h1>Variant-aware bedspread</h1>}
        detailsAfterVariant={null}
      />,
    );

    expect(screen.getByRole("button", { name: "Select color Red" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.queryByAltText("Red swatch")).not.toBeInTheDocument();
  });

  it("replaces the gallery with the selected color and resets its active slide", () => {
    const images = makeGalleryImages();
    render(
      <ProductDetailInteractive
        images={images}
        variants={variants}
        productName="Variant-aware bedspread"
        productSlug="variant-aware-bedspread"
        initialVariantId="variant-red"
        detailsBeforeVariant={<h1>Variant-aware bedspread</h1>}
        detailsAfterVariant={null}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "View image 3" }));
    expect(screen.getByTestId("product-gallery-main-image")).toHaveAttribute("alt", "Red photo 2");

    fireEvent.click(screen.getByRole("button", { name: "Select color Blue" }));

    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getByTestId("product-gallery-main-image")).toHaveAttribute("alt", "Blue hero");
    expect(screen.queryByAltText("Red photo 2")).not.toBeInTheDocument();
  });

  it("filters material and color choices through the selected size hierarchy", () => {
    const hierarchicalVariants: ProductVariant[] = [
      {
        id: "king-cotton-red",
        size: "King",
        price: 120000,
        stock_quantity: 4,
        material: { name: "Cotton" },
        color: { name: "Red", hex_code: "#ff0000" },
      },
      {
        id: "king-cotton-blue",
        size: "King",
        price: 121000,
        stock_quantity: 4,
        material: { name: "Cotton" },
        color: { name: "Blue", hex_code: "#0000ff" },
      },
      {
        id: "queen-cotton-blue",
        size: "Queen",
        price: 110000,
        stock_quantity: 4,
        material: { name: "Cotton" },
        color: { name: "Blue", hex_code: "#0000ff" },
      },
      {
        id: "queen-cotton-yellow",
        size: "Queen",
        price: 111000,
        stock_quantity: 4,
        material: { name: "Cotton" },
        color: { name: "Yellow", hex_code: "#ffff00" },
      },
      {
        id: "queen-linen-green",
        size: "Queen",
        price: 115000,
        stock_quantity: 4,
        material: { name: "Linen" },
        color: { name: "Green", hex_code: "#008000" },
      },
    ];
    const images: ProductImage[] = hierarchicalVariants.map((variant) => ({
      id: `${variant.id}-image`,
      url: `https://example.com/${variant.id}.jpg`,
      alt_text: `${variant.id} image`,
      is_primary: variant.id === "king-cotton-red",
      sort_order: 0,
      variant_id: variant.id,
      image_role: "GALLERY",
    }));

    render(
      <ProductDetailInteractive
        images={images}
        variants={hierarchicalVariants}
        productName="Hierarchical bedspread"
        productSlug="hierarchical-bedspread"
        initialVariantId="king-cotton-red"
        detailsBeforeVariant={null}
        detailsAfterVariant={null}
      />,
    );

    expect(screen.getByRole("button", { name: "Select color Red" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select color Blue" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Select color Yellow" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Queen" }));

    expect(screen.getByRole("button", { name: "Queen" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Select color Red" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select color Blue" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Select color Yellow" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Select color Green" })).not.toBeInTheDocument();
    expect(screen.getByTestId("product-gallery-main-image")).toHaveAttribute(
      "alt",
      "queen-cotton-blue image",
    );

    fireEvent.click(screen.getByRole("button", { name: "Linen" }));

    expect(screen.getByRole("button", { name: "Linen" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Select color Green" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByRole("button", { name: "Select color Blue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Select color Yellow" })).not.toBeInTheDocument();
    expect(screen.getByTestId("product-gallery-main-image")).toHaveAttribute(
      "alt",
      "queen-linen-green image",
    );
  });
});
