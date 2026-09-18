import { describe, expect, it, vi } from "vitest";
import sitemap from "./sitemap";
import { getProducts, getPublicCategories } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  getProducts: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    limit: 100,
  }),
  getPublicCategories: vi.fn().mockResolvedValue([
    {
      id: "category-1",
      name: "Bedspreads",
      slug: "bedspreads",
      description: null,
      image_url: null,
    },
  ]),
}));

vi.mock("@/lib/guides", () => ({
  getAllGuides: vi.fn().mockReturnValue([]),
}));

describe("sitemap", () => {
  it("publishes only populated public category URLs", async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(getPublicCategories).toHaveBeenCalledTimes(1);
    expect(getProducts).toHaveBeenCalledWith({ limit: 100 });
    expect(urls).toContain("https://sunfabb.com/catalog?category=bedspreads");
    expect(urls.some((url) => url.includes("category=towels"))).toBe(false);
    expect(urls.some((url) => url.includes("category=table-linen"))).toBe(
      false,
    );
  });
});
