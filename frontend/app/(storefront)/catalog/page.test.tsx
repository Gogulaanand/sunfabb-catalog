import { describe, expect, it, vi } from "vitest";
import { generateMetadata } from "./page";
import { getPublicCategories } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  getPublicCategories: vi.fn(),
}));

const publicCategories = vi.mocked(getPublicCategories);

describe("catalog page category metadata", () => {
  it("uses populated public categories and safe generic copy", async () => {
    publicCategories.mockResolvedValue([
      {
        id: "category-1",
        name: "Bedspreads",
        slug: "bedspreads",
        description: "Admin-only copy",
        image_url: null,
      },
    ]);

    const metadata = await generateMetadata({
      searchParams: Promise.resolve({ category: "bedspreads" }),
    });

    expect(publicCategories).toHaveBeenCalledTimes(1);
    expect(metadata.title).toBe("Bedspreads Collection");
    expect(metadata.description).toBe(
      "Browse Sunfabb's Bedspreads collection from India.",
    );
    expect(metadata.description).not.toContain("Admin-only");
  });

  it("falls back to generic copy for an unavailable public category", async () => {
    publicCategories.mockResolvedValue([]);

    const metadata = await generateMetadata({
      searchParams: Promise.resolve({ category: "towels" }),
    });

    expect(metadata.title).toBe("Catalog");
    expect(metadata.description).toBe(
      "Browse the current Sunfabb catalog of home textiles from India.",
    );
  });
});
