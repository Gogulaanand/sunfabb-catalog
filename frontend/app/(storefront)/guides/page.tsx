import type { Metadata } from "next";
import Link from "next/link";
import { getAllGuides, formatGuideDate } from "@/lib/guides";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sunfabb.com";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "Practical guides to choosing and caring for home textiles - towel GSM, bedspread sizing for Indian beds, washing cotton, and setting a table.",
  alternates: { canonical: `${siteUrl}/guides` },
};

export default function GuidesIndexPage() {
  const guides = getAllGuides();

  return (
    <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-(--spacing-margin-mobile) md:py-16">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: `${siteUrl}/` },
          { name: "Guides", url: `${siteUrl}/guides` },
        ]}
      />

      <nav aria-label="Breadcrumb" className="text-body-sm text-on-surface-variant mb-6">
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-on-surface">Guides</span>
      </nav>

      <h1 className="font-display text-headline-md-mobile md:text-headline-md text-on-surface mb-2">
        Guides
      </h1>
      <p className="text-body-md text-on-surface-variant mb-12 max-w-2xl">
        Straight answers on choosing and caring for home textiles - sizes,
        weights, and wash routines that actually hold up.
      </p>

      <StaggerGroup className="grid grid-cols-1 md:grid-cols-2 gap-(--spacing-gutter-desktop)">
        {guides.map((guide) => (
          <StaggerItem key={guide.slug}>
            <article className="h-full">
              <Link
                href={`/guides/${guide.slug}`}
                className="group block h-full rounded-(--radius-md) border border-outline-variant p-6 transition-colors hover:border-primary hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <p className="text-label-caps uppercase text-on-surface-variant mb-3">
                  {guide.category}
                </p>
                <h2 className="font-display text-title-sm text-on-surface mb-2 group-hover:text-primary transition-colors">
                  {guide.title}
                </h2>
                <p className="text-body-sm text-on-surface-variant mb-4">
                  {guide.description}
                </p>
                <time
                  dateTime={guide.date}
                  className="text-body-sm text-outline"
                >
                  {formatGuideDate(guide.date)}
                </time>
              </Link>
            </article>
          </StaggerItem>
        ))}
      </StaggerGroup>

      <Reveal className="mt-16">
        <p className="text-body-md text-on-surface-variant">
          Looking for something specific?{" "}
          <Link
            href="/catalog"
            className="text-primary underline underline-offset-4 hover:text-primary-container transition-colors"
          >
            Browse the full catalog
          </Link>
          .
        </p>
      </Reveal>
    </div>
  );
}
