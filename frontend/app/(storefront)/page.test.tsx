import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./page";
import {
  getProducts,
  getPublicCategories,
  getPublicColors,
  getPublicMaterials,
} from "@/lib/api";

vi.mock("@/lib/api", () => ({
  getProducts: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    limit: 8,
  }),
  getPublicCategories: vi.fn().mockResolvedValue([]),
  getPublicColors: vi.fn().mockResolvedValue([]),
  getPublicMaterials: vi.fn().mockResolvedValue([]),
}));

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string }) => (
    <img src={props.src} alt={props.alt} />
  ),
}));

vi.mock("@/components/home/hero-section", () => ({
  HeroSection: () => <div />,
}));
vi.mock("@/components/home/collection-browser", () => ({
  CollectionBrowser: () => <div />,
}));
vi.mock("@/components/home/product-rail", () => ({
  ProductRail: () => <div />,
}));
vi.mock("@/components/home/table-linen-split", () => ({
  TableLinenSplit: () => <div />,
}));
vi.mock("@/components/home/choosing-guide", () => ({
  ChoosingGuide: () => <div />,
}));
vi.mock("@/components/home/materials-care", () => ({
  MaterialsCare: () => <div />,
}));
vi.mock("@/components/home/image-cta", () => ({
  ImageCta: () => <div />,
}));
vi.mock("@/components/home/shopping-facet-accordion", () => ({
  ShoppingFacetAccordion: () => <div />,
}));
vi.mock("@/components/analytics/track-item-list", () => ({
  TrackItemList: () => null,
}));
vi.mock("@/components/analytics/tracked-content-link", () => ({
  TrackedContentLink: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@/components/analytics/tracked-section", () => ({
  TrackedSection: ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  ),
}));

describe("HomePage", () => {
  it("loads only populated public facets for the shopping path", async () => {
    render(await HomePage());

    expect(getProducts).toHaveBeenCalledWith({ limit: 8 });
    expect(getPublicCategories).toHaveBeenCalledTimes(1);
    expect(getPublicMaterials).toHaveBeenCalledTimes(1);
    expect(getPublicColors).toHaveBeenCalledTimes(1);
  });
});
