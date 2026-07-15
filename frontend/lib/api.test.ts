import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { formatPrice, getProducts, getProduct, getCategories } from "./api";

// Real-shaped fixtures mirroring the actual backend payload (uuid string ids,
// stock_quantity, sort_order) — see docs/DECISIONS.md D30.
const categoryFixture = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Bedspreads",
  slug: "bedspreads",
  description: null,
  image_url: null,
};

// The category embedded in a product response only carries name + slug
// (the backend selects a subset for that relation).
const productCategoryFixture = {
  name: "Bedspreads",
  slug: "bedspreads",
};

const imageFixture = {
  id: "33333333-3333-3333-3333-333333333333",
  url: "https://example.com/img.jpg",
  alt_text: null,
  is_primary: true,
  sort_order: 0,
  variant_id: "22222222-2222-2222-2222-222222222222",
  image_role: "GALLERY" as const,
};

// The product-detail endpoint returns full variants, including the nested
// material/color (name only — no id, see lib/api.ts).
const detailVariantFixture = {
  id: "22222222-2222-2222-2222-222222222222",
  size: "Queen",
  price: 125000,
  stock_quantity: 4,
  material: { name: "Cotton" },
  color: { name: "Indigo", hex_code: "#3F51B5" },
};

const productFixture = {
  id: "44444444-4444-4444-4444-444444444444",
  name: "Royal Cotton Bedspread",
  slug: "royal-cotton-bedspread",
  description: null,
  care_instructions: null,
  category: productCategoryFixture,
  variants: [detailVariantFixture],
  images: [imageFixture],
};

// The product-list endpoint (catalog grid) only selects each variant's
// price — not the full variant shape.
const listVariantFixture = { price: 125000 };

const listProductFixture = {
  id: "55555555-5555-5555-5555-555555555555",
  name: "Royal Cotton Bedspread",
  slug: "royal-cotton-bedspread",
  description: null,
  category: productCategoryFixture,
  variants: [listVariantFixture],
  images: [imageFixture],
};

describe("formatPrice", () => {
  it("formats paise as INR currency", () => {
    expect(formatPrice(125000)).toBe("₹1,250.00");
  });

  it("formats zero correctly", () => {
    expect(formatPrice(0)).toBe("₹0.00");
  });
});

describe("getProducts", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("builds query params only for provided filters", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, page: 1, limit: 20 }),
    });

    await getProducts({ categorySlug: "bedspreads", sortBy: "price_asc" });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("categorySlug=bedspreads");
    expect(calledUrl).toContain("sortBy=price_asc");
    expect(calledUrl).not.toContain("materialId");
    expect(calledUrl).not.toContain("colorId");
  });

  it("omits the query string entirely when no filters are given", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, page: 1, limit: 20 }),
    });

    await getProducts();

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("?");
  });

  it("throws when the response is not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false });

    await expect(getProducts()).rejects.toThrow("Failed to fetch products");
  });

  it("returns parsed products matching the real backend shape", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [listProductFixture], total: 1, page: 1, limit: 20 }),
    });

    const result = await getProducts();
    expect(result.items[0].variants[0].price).toBe(125000);
    expect(result.items[0].images[0].sort_order).toBe(0);
    expect(result.items[0].images[0].variant_id).toBe(detailVariantFixture.id);
    expect(result.items[0].images[0].image_role).toBe("GALLERY");
    expect(typeof result.items[0].id).toBe("string");
  });

  it("throws when a response is missing an expected field", async () => {
    const { sort_order, ...imageWithoutSortOrder } = imageFixture;
    void sort_order;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ ...listProductFixture, images: [imageWithoutSortOrder] }],
        total: 1,
        page: 1,
        limit: 20,
      }),
    });

    await expect(getProducts()).rejects.toThrow();
  });
});

describe("getProduct", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("requests the product by slug and throws a descriptive error on failure", async () => {
    fetchMock.mockResolvedValue({ ok: false });

    await expect(getProduct("royal-cotton-bedspread")).rejects.toThrow(
      "Failed to fetch product: royal-cotton-bedspread"
    );
    expect(fetchMock.mock.calls[0][0]).toContain("/products/royal-cotton-bedspread");
  });

  it("returns a parsed product matching the real backend shape", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => productFixture });

    const result = await getProduct("royal-cotton-bedspread");
    expect(result.variants[0].stock_quantity).toBe(4);
    expect(typeof result.id).toBe("string");
    expect(result).toEqual(productFixture);
  });

  it("throws when a variant is missing stock_quantity", async () => {
    const { stock_quantity, ...variantWithoutStock } = detailVariantFixture;
    void stock_quantity;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ...productFixture, variants: [variantWithoutStock] }),
    });

    await expect(getProduct("royal-cotton-bedspread")).rejects.toThrow();
  });

  it("rejects malformed product image fields", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...productFixture,
        images: [{ ...imageFixture, variant_id: 42 }],
      }),
    });

    await expect(getProduct("royal-cotton-bedspread")).rejects.toThrow();
  });

  it("rejects an unsupported product image role", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...productFixture,
        images: [{ ...imageFixture, image_role: "THUMBNAIL" }],
      }),
    });

    await expect(getProduct("royal-cotton-bedspread")).rejects.toThrow();
  });
});

describe("getCategories", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("returns parsed categories on success", async () => {
    const categories = [categoryFixture];
    fetchMock.mockResolvedValue({ ok: true, json: async () => categories });

    await expect(getCategories()).resolves.toEqual(categories);
  });
});
