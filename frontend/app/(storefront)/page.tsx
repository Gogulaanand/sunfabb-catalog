import type { Metadata } from 'next';
import Image from 'next/image';
import {
  getPublicCategories,
  getPublicColors,
  getPublicMaterials,
  getProducts,
  type ProductListItem,
} from '@/lib/api';
import { HeroSection } from '@/components/home/hero-section';
import { TrackItemList } from '@/components/analytics/track-item-list';
import { TrackedContentLink } from '@/components/analytics/tracked-content-link';
import { TrackedSection } from '@/components/analytics/tracked-section';
import { SOCIAL_PREVIEW_IMAGE, whatsappLink } from '@/lib/site-config';
import type { AnalyticsItem } from '@/lib/analytics';
import { CollectionBrowser } from '@/components/home/collection-browser';
import { ProductRail } from '@/components/home/product-rail';
import { TableLinenSplit } from '@/components/home/table-linen-split';
import { ChoosingGuide } from '@/components/home/choosing-guide';
import { MaterialsCare } from '@/components/home/materials-care';
import { ImageCta } from '@/components/home/image-cta';
import { ShoppingFacetAccordion } from '@/components/home/shopping-facet-accordion';

export const metadata: Metadata = {
  title: {
    absolute: 'Sunfabb - Bedspreads & Home Textiles from India',
  },
  description:
    'Explore Sunfabb bedspread designs and home textiles from India.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Sunfabb - Bedspreads & Home Textiles from India',
    description:
      'Explore Sunfabb bedspread designs and home textiles from India.',
    url: '/',
    images: [SOCIAL_PREVIEW_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    images: [SOCIAL_PREVIEW_IMAGE.url],
  },
};

function lowestPrice(product: ProductListItem): number | null {
  return product.variants.length
    ? Math.min(...product.variants.map((variant) => variant.price))
    : null;
}

export default async function HomePage() {
  const [featuredResult, categories, materials, colors] = await Promise.all([
    getProducts({ limit: 8 })
      .then((data) => ({ data, isUnavailable: false }))
      .catch(() => ({
        data: {
          items: [],
          total: 0,
          page: 1,
          limit: 8,
        },
        isUnavailable: true,
      })),
    getPublicCategories().catch(() => []),
    getPublicMaterials().catch(() => []),
    getPublicColors().catch(() => []),
  ]);
  const featured = featuredResult.data;
  const analyticsItems: AnalyticsItem[] = featured.items.map(
    (product, index) => ({
      item_id: product.id,
      item_name: product.name,
      price_paise: lowestPrice(product) ?? 0,
      item_category: product.category.name,
      index: index + 1,
    }),
  );
  const whatsappHref = whatsappLink(
    "Hi Sunfabb, I'd like help choosing a design from your collection.",
  );

  return (
    <div className="bg-home-paper text-home-graphite">
      <HeroSection />

      <TrackedSection
        sectionId="shopping-path"
        position={1}
        labelledBy="home-intro-title"
        className="border-b border-home-stone"
      >
        <div className="mx-auto grid max-w-(--spacing-container-max) gap-10 px-5 py-16 md:min-h-[46.875rem] md:grid-cols-[45%_55%] md:items-center md:gap-16 md:px-(--spacing-margin-desktop) md:py-24">
          <div className="flex flex-col justify-center">
            <p className="font-label text-xs font-bold uppercase tracking-[0.16em] text-home-graphite/60">
              Sunfabb at home
            </p>
            <h2
              id="home-intro-title"
              className="mt-6 max-w-xl font-display text-3xl font-medium leading-[1.1] tracking-[-0.04em] sm:text-4xl md:text-5xl"
            >
              Good textiles should be easy to live with.
            </h2>
            <p className="mt-7 max-w-md text-[1.0625rem] leading-7 text-home-graphite/80">
              Browse by room, compare the texture and size, and choose what
              works with the home you already have.
            </p>
            <TrackedContentLink
              href="/guides"
              contentType="homepage_support"
              contentId="intro_how_to_choose"
              linkLocation="home_intro"
              className="font-label mt-8 inline-flex w-fit border-b border-home-graphite pb-1 text-xs font-bold uppercase tracking-[0.16em] text-home-graphite transition-colors hover:text-home-graphite/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-graphite focus-visible:ring-offset-2"
            >
              How to choose
            </TrackedContentLink>
            <ShoppingFacetAccordion
              categories={categories}
              materials={materials}
              colors={colors}
            />
          </div>
          <div className="relative min-h-[24rem] overflow-hidden rounded-sm md:h-full md:min-h-[36rem]">
            <Image
              src="/images/home/sunfabb-hero-option-a.png"
              alt="Natural bedroom with layered home textiles"
              fill
              loading="eager"
              sizes="(max-width: 767px) 100vw, 55vw"
              className="object-cover"
              style={{ objectPosition: '58% 52%' }}
            />
          </div>
        </div>
      </TrackedSection>

      <TrackedSection
        sectionId="collection-story"
        position={2}
        labelledBy="collection-browser-title"
        className="bg-home-walnut"
      >
        <div className="mx-auto max-w-(--spacing-container-max) px-5 py-16 md:px-(--spacing-margin-desktop) md:py-24 lg:py-28">
          <CollectionBrowser />
        </div>
      </TrackedSection>

      <TrackedSection
        sectionId="featured-designs"
        position={3}
        labelledBy="featured-designs-title"
        className="border-y border-home-stone bg-home-paper"
      >
        <div className="mx-auto flex max-w-(--spacing-container-max) flex-col justify-center px-5 py-16 md:min-h-[56.25rem] md:px-(--spacing-margin-desktop) md:py-24">
          <div className="mb-8 flex flex-col justify-between gap-5 md:mb-12 md:flex-row md:items-end">
            <h2
              id="featured-designs-title"
              className="font-display text-3xl font-medium tracking-[-0.04em] sm:text-4xl md:text-5xl"
            >
              New textures
            </h2>
          </div>
          <TrackItemList
            items={analyticsItems}
            listName="Homepage designs"
            listId="homepage-designs"
            listKey="homepage-designs"
          />
          <ProductRail
            products={featured.items}
            analyticsItems={analyticsItems}
            isUnavailable={featuredResult.isUnavailable}
          />
        </div>
      </TrackedSection>

      <TrackedSection
        sectionId="table-linen"
        position={4}
        labelledBy="table-linen-title"
        className="bg-home-stone"
      >
        <TableLinenSplit />
      </TrackedSection>

      <TrackedSection
        sectionId="shopping-help"
        position={5}
        labelledBy="choosing-guide-title"
        className="bg-home-paper"
      >
        <div className="mx-auto max-w-(--spacing-container-max) px-5 py-16 md:px-(--spacing-margin-desktop) md:py-32">
          <ChoosingGuide whatsappHref={whatsappHref} />
        </div>
      </TrackedSection>

      <TrackedSection
        sectionId="materials-care"
        position={6}
        labelledBy="materials-care-title"
        className="bg-white"
      >
        <div className="mx-auto max-w-(--spacing-container-max) px-5 py-16 md:px-(--spacing-margin-desktop) md:py-20">
          <MaterialsCare />
        </div>
      </TrackedSection>

      <TrackedSection
        sectionId="guided-shopping"
        position={7}
        labelledBy="image-cta-title"
        className="bg-home-graphite"
      >
        <ImageCta whatsappHref={whatsappHref} />
      </TrackedSection>
    </div>
  );
}
