import type { AdminProductListItem } from "./admin-api";

export type SeoGap =
  | "description"
  | "care_instructions"
  | "images"
  | "alt_text";

/** What each gap is called in the admin UI. */
export const SEO_GAP_LABELS: Record<SeoGap, string> = {
  description: "No description",
  care_instructions: "No care info",
  images: "No images",
  alt_text: "Missing alt text",
};

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/**
 * Content gaps that hurt a product's search and AI-citation surface.
 *
 * Read-only: this derives everything from the admin list payload and never
 * writes. Whitespace-only values count as missing, because a description of
 * " " is indistinguishable from none to a crawler.
 */
export function getSeoGaps(
  product: Pick<
    AdminProductListItem,
    "description" | "care_instructions" | "_count" | "images_missing_alt_text"
  >,
): SeoGap[] {
  const gaps: SeoGap[] = [];

  if (isBlank(product.description)) gaps.push("description");
  if (isBlank(product.care_instructions)) gaps.push("care_instructions");

  if (product._count.images === 0) {
    // "No images" already implies missing alt text — reporting both would be
    // two badges for one problem.
    gaps.push("images");
  } else if (product.images_missing_alt_text > 0) {
    gaps.push("alt_text");
  }

  return gaps;
}

export function isSeoComplete(
  product: Parameters<typeof getSeoGaps>[0],
): boolean {
  return getSeoGaps(product).length === 0;
}
