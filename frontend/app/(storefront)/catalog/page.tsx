import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { getCategories } from '@/lib/api';
import { parseCatalogSearchParams } from '@/lib/catalog-query';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import CatalogContent from './CatalogContent';
import CatalogGridSkeleton from './CatalogGridSkeleton';
import { CategoryIntro } from './CategoryIntro';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sunfabb.com';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const { categorySlug } = parseCatalogSearchParams(params);

  const categories = categorySlug
    ? await getCategories().catch(() => [])
    : [];
  const category = categories.find((c) => c.slug === categorySlug);
  const canonical = category
    ? `${siteUrl}/catalog?category=${encodeURIComponent(category.slug)}`
    : `${siteUrl}/catalog`;

  if (categorySlug) {
    const title = category ? `${category.name} Collection` : 'Catalog';
    const description =
      category?.description ??
      `Browse Sunfabb's ${category?.name ?? ''} collection from India.`;
    return {
      title,
      description,
      alternates: { canonical },
    };
  }

  return {
    title: 'All Products',
    description:
      'Browse the full Sunfabb range of bedspreads, towels, napkins and table linen from India.',
    alternates: { canonical },
  };
}

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default async function CatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const { categorySlug, materialId, colorId, sortBy, page } =
    parseCatalogSearchParams(params);

  // Derive display name from the slug immediately - no fetch needed for the shell.
  const provisionalName = categorySlug ? slugToTitle(categorySlug) : undefined;

  // Category intro copy is fetched here rather than inside the Suspense
  // boundary below, deliberately. Its whole purpose is to give crawlers and
  // LLMs prose to rank and cite, and streamed content arrives in a <template>
  // that a non-JS crawler will not see. The cost is bounded: this is the same
  // ISR-cached call generateMetadata already makes for category views, and
  // the unfiltered catalog skips it entirely.
  const categoryDescription = categorySlug
    ? await getCategories()
        .catch(() => [])
        .then(
          (categories) =>
            categories.find((c) => c.slug === categorySlug)?.description,
        )
    : undefined;

  return (
    <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-(--spacing-margin-mobile) md:py-16">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: `${siteUrl}/` },
          categorySlug
            ? {
                name: provisionalName ?? categorySlug,
                url: `${siteUrl}/catalog?category=${categorySlug}`,
              }
            : { name: 'All Products', url: `${siteUrl}/catalog` },
        ]}
      />

      {/* Breadcrumb - renders immediately, no data fetch */}
      <nav className="text-body-sm text-on-surface-variant mb-6">
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-on-surface">
          {provisionalName ?? 'All Products'}
        </span>
      </nav>

      <h1 className="font-display text-headline-md-mobile md:text-headline-md text-on-surface mb-2">
        {provisionalName ? `The ${provisionalName} Collection` : 'All Products'}
      </h1>
      {/* The category's own copy wins where it exists; the generic tagline is
          the fallback, so the two never stack and the slot is never empty.
          Most categories have no description yet, so the fallback is still the
          common path on category views. */}
      {categoryDescription?.trim() ? (
        <CategoryIntro description={categoryDescription} />
      ) : (
        <p className="text-body-md text-on-surface-variant mb-10 max-w-2xl">
          Browse the current Sunfabb catalog of home textiles.
        </p>
      )}

      {/* Filters + grid stream in behind a skeleton */}
      <Suspense fallback={<CatalogGridSkeleton />}>
        <CatalogContent
          categorySlug={categorySlug}
          materialId={materialId}
          colorId={colorId}
          sortBy={sortBy}
          page={page}
        />
      </Suspense>
    </div>
  );
}
