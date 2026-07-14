/* eslint-disable @next/next/no-img-element */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ProductImage, ProductVariant } from "@/lib/api";
import { getInitialVariantId } from "./product-gallery-utils";
import { ProductDetailInteractive } from "./ProductDetailInteractive";

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
});
