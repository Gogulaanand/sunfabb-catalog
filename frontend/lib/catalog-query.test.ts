import { describe, expect, it } from "vitest";
import {
  constrainCatalogQuery,
  parseCatalogSearchParams,
} from "./catalog-query";

const facets = {
  categorySlugs: ["bedspreads"],
  materialIds: ["material-cotton"],
  colorIds: ["color-indigo"],
};

describe("parseCatalogSearchParams", () => {
  it("keeps supported filters and pagination", () => {
    expect(
      parseCatalogSearchParams({
        category: "bedspreads",
        material: "material-cotton",
        color: "color-indigo",
        sort: "price_asc",
        page: "2",
      }),
    ).toEqual({
      categorySlug: "bedspreads",
      materialId: "material-cotton",
      colorId: "color-indigo",
      sortBy: "price_asc",
      page: 2,
    });
  });

  it("rejects unsupported sorts and malformed pages", () => {
    expect(
      parseCatalogSearchParams({ sort: "random", page: "2.5" }),
    ).toEqual({
      categorySlug: undefined,
      materialId: undefined,
      colorId: undefined,
      sortBy: undefined,
      page: 1,
    });
  });

  it("does not treat repeated or empty values as selected facets", () => {
    expect(
      parseCatalogSearchParams({
        category: ["bedspreads", "towels"],
        material: "",
      }),
    ).toEqual({
      categorySlug: undefined,
      materialId: undefined,
      colorId: undefined,
      sortBy: undefined,
      page: 1,
    });
  });
});

describe("constrainCatalogQuery", () => {
  it("keeps only facets present in the active lookup data", () => {
    expect(
      constrainCatalogQuery(
        {
          categorySlug: "bedspreads",
          materialId: "stale-material",
          colorId: "color-indigo",
          sortBy: "name",
          page: 3,
        },
        facets,
      ),
    ).toEqual({
      categorySlug: "bedspreads",
      materialId: undefined,
      colorId: "color-indigo",
      sortBy: "name",
      page: 3,
    });
  });

  it("turns stale facet links into the unfiltered first page", () => {
    expect(
      constrainCatalogQuery(
        {
          categorySlug: "removed-category",
          materialId: "removed-material",
          colorId: "removed-color",
          page: 0,
        },
        facets,
      ),
    ).toEqual({
      categorySlug: undefined,
      materialId: undefined,
      colorId: undefined,
      sortBy: undefined,
      page: 1,
    });
  });
});
