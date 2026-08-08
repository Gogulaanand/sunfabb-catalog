export const CATALOG_SORTS = [
  "name",
  "price_asc",
  "price_desc",
] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number];

export interface ParsedCatalogQuery {
  categorySlug?: string;
  materialId?: string;
  colorId?: string;
  sortBy?: CatalogSort;
  page: number;
}

export interface CatalogFacetValues {
  categorySlugs: readonly string[];
  materialIds: readonly string[];
  colorIds: readonly string[];
}

type SearchParams = Record<string, string | string[] | undefined>;

function firstString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parsePage(value: string | undefined): number {
  if (!value) return 1;

  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

function parseSort(value: string | undefined): CatalogSort | undefined {
  return value ? CATALOG_SORTS.find((sort) => sort === value) : undefined;
}

/**
 * Parses untrusted URL search parameters without asserting that arbitrary
 * strings are valid catalogue query values.
 */
export function parseCatalogSearchParams(
  searchParams: SearchParams,
): ParsedCatalogQuery {
  return {
    categorySlug: firstString(searchParams.category),
    materialId: firstString(searchParams.material),
    colorId: firstString(searchParams.color),
    sortBy: parseSort(firstString(searchParams.sort)),
    page: parsePage(firstString(searchParams.page)),
  };
}

/**
 * Keeps URL-selected facets constrained to values exposed by the active
 * catalogue lookup data. Invalid or stale links become the unfiltered view,
 * while the supported sort and pagination values remain safe to pass through.
 */
export function constrainCatalogQuery(
  query: ParsedCatalogQuery,
  facets: CatalogFacetValues,
): ParsedCatalogQuery {
  return {
    categorySlug: facets.categorySlugs.includes(query.categorySlug ?? "")
      ? query.categorySlug
      : undefined,
    materialId: facets.materialIds.includes(query.materialId ?? "")
      ? query.materialId
      : undefined,
    colorId: facets.colorIds.includes(query.colorId ?? "")
      ? query.colorId
      : undefined,
    sortBy: query.sortBy,
    page: Number.isInteger(query.page) && query.page >= 1 ? query.page : 1,
  };
}
