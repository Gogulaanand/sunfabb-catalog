/* eslint-disable @next/next/no-img-element */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import type { ProductImage } from "@/lib/api";
import { ProductGallery } from "./ProductGallery";
import { getApplicableGalleryImages } from "./product-gallery-utils";

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

function makeImage(
  id: string,
  variant_id: string | null,
  image_role: "GALLERY" | "SWATCH" = "GALLERY",
  sort_order = 0,
  is_primary = false,
): ProductImage {
  return {
    id,
    url: `https://example.com/${id}.jpg`,
    alt_text: id,
    is_primary,
    sort_order,
    variant_id,
    image_role,
  };
}

function StatefulGallery({ images }: { images: ProductImage[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <ProductGallery
      images={images}
      productName="Test product"
      selectedVariantId="variant-a"
      activeIndex={activeIndex}
      onActiveIndexChange={setActiveIndex}
    />
  );
}

const threeImages = [
  makeImage("one", "variant-a", "GALLERY", 0, true),
  makeImage("two", "variant-a", "GALLERY", 1),
  makeImage("three", "variant-a", "GALLERY", 2),
];

describe("product gallery selection", () => {
  it("keeps shared gallery images, filters other variants, and excludes swatches", () => {
    const images = [
      makeImage("variant-a-hero", "variant-a", "GALLERY", 1),
      makeImage("shared", null, "GALLERY", 2),
      makeImage("variant-b-hero", "variant-b", "GALLERY", 0, true),
      makeImage("variant-a-swatch", "variant-a", "SWATCH", 0),
    ];

    expect(getApplicableGalleryImages(images, "variant-a").map((image) => image.id)).toEqual([
      "variant-a-hero",
      "shared",
    ]);
  });

  it("supports clickable thumbnails and selected-thumbnail semantics", () => {
    render(<StatefulGallery images={threeImages} />);

    fireEvent.click(screen.getByRole("tab", { name: "View image 2" }));

    expect(screen.getByTestId("product-gallery-main-image")).toHaveAttribute("alt", "two");
    expect(screen.getByRole("tab", { name: "View image 2" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("wraps previous and next controls at the ends", () => {
    render(<StatefulGallery images={threeImages} />);

    fireEvent.click(screen.getByRole("button", { name: "Previous image" }));
    expect(screen.getByTestId("product-gallery-main-image")).toHaveAttribute("alt", "three");

    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    expect(screen.getByTestId("product-gallery-main-image")).toHaveAttribute("alt", "one");
  });

  it("supports left/right keyboard navigation", () => {
    render(<StatefulGallery images={threeImages} />);
    const carousel = screen.getByRole("region", { name: "Test product product images" });

    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    expect(screen.getByTestId("product-gallery-main-image")).toHaveAttribute("alt", "two");

    fireEvent.keyDown(carousel, { key: "ArrowLeft" });
    expect(screen.getByTestId("product-gallery-main-image")).toHaveAttribute("alt", "one");
  });

  it("supports touch swipe navigation", () => {
    render(<StatefulGallery images={threeImages} />);
    const carousel = screen.getByRole("region", { name: "Test product product images" });

    fireEvent.touchStart(carousel, { changedTouches: [{ clientX: 160 }] });
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 80 }] });

    expect(screen.getByTestId("product-gallery-main-image")).toHaveAttribute("alt", "two");
  });

  it("preserves the empty placeholder and hides controls for zero or one image", () => {
    const { rerender } = render(<StatefulGallery images={[]} />);
    expect(screen.getByText("🧵")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Previous image" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next image" })).not.toBeInTheDocument();

    rerender(<StatefulGallery images={threeImages.slice(0, 1)} />);
    expect(screen.getByTestId("product-gallery-main-image")).toHaveAttribute("alt", "one");
    expect(screen.queryByRole("button", { name: "Previous image" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next image" })).not.toBeInTheDocument();
  });
});
