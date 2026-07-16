import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { buildProductSchemaData, ProductSchema } from "./ProductSchema";
import type { Product } from "@/lib/api";

const imageFixture = {
  id: "img-1",
  url: "https://res.cloudinary.com/demo/image/upload/v1/products/test.jpg",
  alt_text: "Test product",
  is_primary: true,
  sort_order: 0,
  variant_id: null,
  image_role: "GALLERY" as const,
};

const productFixture: Product = {
  id: "prod-1",
  name: "Royal Cotton Bedspread",
  slug: "royal-cotton-bedspread",
  description: "A premium cotton bedspread.",
  care_instructions: "Machine wash cold.",
  updated_at: "2026-01-01T00:00:00.000Z",
  category: { name: "Bedspreads", slug: "bedspreads" },
  variants: [
    {
      id: "var-1",
      size: "Queen",
      price: 125000,
      stock_quantity: 4,
      material: { name: "Cotton" },
      color: { name: "Ivory", hex_code: "#FFFFF0" },
    },
    {
      id: "var-2",
      size: "King",
      price: 150000,
      stock_quantity: 0,
      material: { name: "Cotton" },
      color: { name: "Ivory", hex_code: "#FFFFF0" },
    },
  ],
  images: [imageFixture],
};

describe("buildProductSchemaData", () => {
  it("converts paise price to INR with 2 decimal places", () => {
    const data = buildProductSchemaData(productFixture, "https://sunfabb.com");
    const offer = (data.offers as Array<Record<string, unknown>>)[0];
    expect(offer.price).toBe("1250.00");
    expect(offer.priceCurrency).toBe("INR");
  });

  it("maps stock_quantity > 0 to InStock", () => {
    const data = buildProductSchemaData(productFixture, "https://sunfabb.com");
    const offers = data.offers as Array<Record<string, unknown>>;
    expect(offers[0].availability).toBe("https://schema.org/InStock");
  });

  it("maps stock_quantity === 0 to OutOfStock", () => {
    const data = buildProductSchemaData(productFixture, "https://sunfabb.com");
    const offers = data.offers as Array<Record<string, unknown>>;
    expect(offers[1].availability).toBe("https://schema.org/OutOfStock");
  });

  it("sets the product URL correctly", () => {
    const data = buildProductSchemaData(productFixture, "https://sunfabb.com");
    const offer = (data.offers as Array<Record<string, unknown>>)[0];
    expect(offer.url).toBe(
      "https://sunfabb.com/catalog/royal-cotton-bedspread",
    );
  });

  it("picks the primary GALLERY image for the image field", () => {
    const data = buildProductSchemaData(productFixture, "https://sunfabb.com");
    expect(data.image).toBe(imageFixture.url);
  });

  it("sets brand name to Sunfabb", () => {
    const data = buildProductSchemaData(productFixture, "https://sunfabb.com");
    expect((data.brand as Record<string, unknown>).name).toBe("Sunfabb");
  });

  it("omits image when no GALLERY images exist", () => {
    const noImages = { ...productFixture, images: [] };
    const data = buildProductSchemaData(noImages, "https://sunfabb.com");
    expect("image" in data).toBe(false);
  });
});

describe("ProductSchema", () => {
  it("renders a script tag with type application/ld+json", () => {
    const { container } = render(
      <ProductSchema
        product={productFixture}
        siteUrl="https://sunfabb.com"
      />,
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();
  });

  it("renders parseable JSON-LD with correct @type", () => {
    const { container } = render(
      <ProductSchema
        product={productFixture}
        siteUrl="https://sunfabb.com"
      />,
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    const parsed = JSON.parse(script!.textContent!);
    expect(parsed["@type"]).toBe("Product");
    expect(parsed.name).toBe("Royal Cotton Bedspread");
  });
});
