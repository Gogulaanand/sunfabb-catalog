import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllGuides, getGuideBySlug, formatGuideDate } from "@/lib/guides";
import { getProducts, formatPrice } from "@/lib/api";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { ArticleSchema } from "@/components/seo/ArticleSchema";
import { ProductCard } from "@/components/product/product-card";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";
import { SOCIAL_PREVIEW_IMAGE } from "@/lib/site-config";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sunfabb.com";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllGuides().map((guide) => ({ slug: guide.slug }));
}

// The guide set is a fixed, in-repo registry, so any slug outside it is a 404
// rather than something worth rendering on demand.
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return { title: "Guide not found" };
  }

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `${siteUrl}/guides/${slug}` },
    openGraph: {
      type: "article",
      title: guide.title,
      description: guide.description,
      url: `${siteUrl}/guides/${slug}`,
      publishedTime: guide.date,
      images: [SOCIAL_PREVIEW_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      images: [SOCIAL_PREVIEW_IMAGE.url],
    },
  };
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const { Component, relatedCategorySlug } = guide;

  // A content page must never fail because the catalog API is briefly down —
  // the related strip just disappears.
  const relatedProducts = relatedCategorySlug
    ? await getProducts({ categorySlug: relatedCategorySlug, limit: 3 })
        .then((res) => res.items)
        .catch(() => [])
    : [];

  return (
    <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-(--spacing-margin-mobile) md:py-16">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: `${siteUrl}/` },
          { name: "Guides", url: `${siteUrl}/guides` },
          { name: guide.title, url: `${siteUrl}/guides/${slug}` },
        ]}
      />
      <ArticleSchema
        headline={guide.title}
        description={guide.description}
        datePublished={guide.date}
        url={`${siteUrl}/guides/${slug}`}
      />

      <nav
        aria-label="Breadcrumb"
        className="text-body-sm text-on-surface-variant mb-6"
      >
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <Link href="/guides" className="hover:text-primary transition-colors">
          Guides
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-on-surface">{guide.category}</span>
      </nav>

      {/* max-w-2xl keeps the measure near 70 characters — long-form content is
          the one place on this site where full container width hurts reading. */}
      <article className="max-w-2xl">
        <header className="mb-10">
          <p className="text-label-caps uppercase text-on-surface-variant mb-4">
            {guide.category}
          </p>
          <h1 className="font-display text-headline-md-mobile md:text-headline-md text-on-surface mb-4 text-balance">
            {guide.title}
          </h1>
          <p className="text-body-md text-on-surface-variant mb-4">
            {guide.description}
          </p>
          <time dateTime={guide.date} className="text-body-sm text-outline">
            {formatGuideDate(guide.date)}
          </time>
        </header>

        <Component />
      </article>

      {relatedProducts.length > 0 && (
        <Reveal className="mt-20 pt-12 border-t border-outline-variant">
          <div className="flex flex-wrap items-baseline justify-between gap-4 mb-8">
            <h2 className="font-display text-headline-md-mobile md:text-headline-md text-on-surface">
              Shop {guide.category}
            </h2>
            <Link
              href={`/catalog?category=${relatedCategorySlug}`}
              className="text-body-sm text-primary underline underline-offset-4 hover:text-primary-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
            >
              View all
            </Link>
          </div>

          <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-(--spacing-gutter-desktop)">
            {relatedProducts.map((product) => {
              const galleryImages = product.images.filter(
                (image) => image.image_role === "GALLERY",
              );
              const primaryImage =
                galleryImages.find((image) => image.is_primary) ??
                galleryImages[0];
              const lowestPrice = product.variants.length
                ? Math.min(...product.variants.map((v) => v.price))
                : null;

              return (
                <StaggerItem key={product.id}>
                  <ProductCard
                    slug={product.slug}
                    name={product.name}
                    imageUrl={primaryImage?.url}
                    imageAlt={primaryImage?.alt_text ?? product.name}
                    formattedPrice={
                      lowestPrice !== null ? formatPrice(lowestPrice) : null
                    }
                    aspectRatio="square"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        </Reveal>
      )}
    </div>
  );
}
