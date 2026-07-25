import { z } from "zod";
import TowelGsm, {
  meta as towelGsmMeta,
} from "@/content/guides/towel-gsm-explained.mdx";
import WashBedspreads, {
  meta as washBedspreadsMeta,
} from "@/content/guides/how-to-wash-cotton-bedspreads.mdx";
import BedspreadSizes, {
  meta as bedspreadSizesMeta,
} from "@/content/guides/bedspread-size-guide-india.mdx";
import TableLinen, {
  meta as tableLinenMeta,
} from "@/content/guides/table-linen-setting-guide.mdx";

/**
 * Frontmatter contract for a guide. Authored by hand inside the MDX file, so
 * it is parsed rather than trusted — a typo'd or missing field fails at import
 * time, which means at build time, not silently at render time.
 */
const guideMetaSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  // ISO date (YYYY-MM-DD). Kept as a string: it only ever gets formatted for
  // display and emitted into the sitemap, never arithmetic.
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  category: z.string().min(1),
  // Slug of the catalog category this guide sends readers to. Null for guides
  // that do not map onto a single collection.
  relatedCategorySlug: z.string().min(1).nullable(),
});

export type GuideMeta = z.infer<typeof guideMetaSchema>;

export interface Guide extends GuideMeta {
  slug: string;
  Component: (props: Record<string, unknown>) => React.JSX.Element;
}

function defineGuide(
  slug: string,
  rawMeta: unknown,
  Component: Guide["Component"],
): Guide {
  const parsed = guideMetaSchema.safeParse(rawMeta);
  if (!parsed.success) {
    throw new Error(
      `Invalid frontmatter in content/guides/${slug}.mdx: ${parsed.error.message}`,
    );
  }
  return { slug, ...parsed.data, Component };
}

/**
 * The guide registry. Adding a guide means dropping an .mdx file into
 * content/guides/ and adding one entry here — deliberately explicit rather
 * than an fs glob, so the set of published guides is greppable, statically
 * typed, and identical in the app, the tests, and the sitemap.
 */
const guides: Guide[] = [
  defineGuide("towel-gsm-explained", towelGsmMeta, TowelGsm),
  defineGuide(
    "how-to-wash-cotton-bedspreads",
    washBedspreadsMeta,
    WashBedspreads,
  ),
  defineGuide("bedspread-size-guide-india", bedspreadSizesMeta, BedspreadSizes),
  defineGuide("table-linen-setting-guide", tableLinenMeta, TableLinen),
];

/** All guides, newest first. */
export function getAllGuides(): Guide[] {
  return [...guides].sort((a, b) => b.date.localeCompare(a.date));
}

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find((guide) => guide.slug === slug);
}

export function formatGuideDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
