import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { formatPrice, getProducts, getProduct, getCategories } from "./api";

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
    const categories = [{ id: 1, name: "Bedspreads", slug: "bedspreads", description: null, image_url: null }];
    fetchMock.mockResolvedValue({ ok: true, json: async () => categories });

    await expect(getCategories()).resolves.toEqual(categories);
  });
});
