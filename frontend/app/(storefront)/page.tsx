import type { Metadata } from 'next';
import Image from 'next/image';
import { getProducts, formatPrice, type ProductListItem } from '@/lib/api';
import { Reveal, StaggerGroup, StaggerItem } from '@/components/motion';
import { ProductCard } from '@/components/product/product-card';
import { HeroSection } from '@/components/home/hero-section';
import { TrackItemList } from '@/components/analytics/track-item-list';
import { TrackedContentLink } from '@/components/analytics/tracked-content-link';
import { TrackedSection } from '@/components/analytics/tracked-section';
import { TrackedWhatsAppLink } from '@/components/analytics/tracked-whatsapp-link';
import { SOCIAL_PREVIEW_IMAGE, whatsappLink } from '@/lib/site-config';
import type { AnalyticsItem } from '@/lib/analytics';

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

function primaryGalleryImage(product: ProductListItem) {
  const gallery = product.images.filter(
    (image) => image.image_role === 'GALLERY',
  );
  return gallery.find((image) => image.is_primary) ?? gallery[0];
}

function lowestPrice(product: ProductListItem): number | null {
  return product.variants.length
    ? Math.min(...product.variants.map((variant) => variant.price))
    : null;
}

export default async function HomePage() {
  const featured = await getProducts({ limit: 8 }).catch(() => ({
    items: [],
    total: 0,
    page: 1,
    limit: 8,
  }));
  const collectionLead = featured.items[0];
  const collectionImage = collectionLead
    ? primaryGalleryImage(collectionLead)
    : undefined;
  const whatsappHref = whatsappLink(
    "Hi Sunfabb, I'd like help choosing a design from your collection.",
  );
  const analyticsItems: AnalyticsItem[] = featured.items.map(
    (product, index) => ({
      item_id: product.id,
      item_name: product.name,
      price_paise: lowestPrice(product) ?? 0,
      item_category: product.category.name,
      index: index + 1,
    }),
  );

  return (
    <>
      <HeroSection />

      <TrackedSection
        sectionId="shopping-path"
        position={1}
        labelledBy="shopping-path-title"
        className="border-b border-outline-variant bg-surface-container-low"
      >
        <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-14 md:py-20">
          <Reveal>
            <div className="max-w-3xl mb-10 md:mb-14">
              <p className="text-label-caps text-primary mb-4">
                A considered way to shop
              </p>
              <h2
                id="shopping-path-title"
                className="font-display text-headline-md-mobile md:text-headline-md text-on-surface mb-4"
              >
                See the design. Check the details. Ask us directly.
              </h2>
              <p className="text-body-md text-on-surface-variant max-w-2xl">
                Explore the collection at your pace, then message Sunfabb for
                help with colours, sizes, availability and delivery before you
                decide.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-8 md:grid-cols-3 md:gap-10">
            {[
              {
                number: '01',
                title: 'Browse current designs',
                body: 'Start with the patterns and colourways that suit your space.',
              },
              {
                number: '02',
                title: 'Compare the details',
                body: 'Open a design to review its available options and product information.',
              },
              {
                number: '03',
                title: 'Confirm before you choose',
                body: 'Ask us directly about current stock, price and delivery.',
              },
            ].map((step) => (
              <div
                key={step.number}
                className="border-t border-outline-variant pt-5"
              >
                <p className="text-label-caps text-primary mb-4">
                  {step.number}
                </p>
                <h3 className="font-display text-title-sm text-on-surface mb-2">
                  {step.title}
                </h3>
                <p className="text-body-sm text-on-surface-variant">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </TrackedSection>

      <TrackedSection
        sectionId="collection-story"
        position={2}
        labelledBy="collection-story-title"
        className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-16 md:py-24 lg:py-32"
      >
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-container">
            {collectionImage ? (
              <Image
                src={collectionImage.url}
                alt={collectionImage.alt_text ?? collectionLead?.name ?? ''}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-outline text-5xl">
                🧵
              </div>
            )}
          </div>

          <Reveal>
            <div>
              <p className="text-label-caps text-primary mb-4">
                The current collection
              </p>
              <h2
                id="collection-story-title"
                className="font-display text-headline-md-mobile md:text-headline-md text-on-surface mb-5"
              >
                Start with a design that feels at home.
              </h2>
              <p className="text-body-md text-on-surface-variant mb-8">
                Discover bedspread patterns across a growing range of
                colourways. Save the design you like, then ask us to help
                confirm the best available option for your space.
              </p>
              <TrackedContentLink
                href="/catalog?category=bedspreads"
                contentType="homepage_cta"
                contentId="collection_story_bedspreads"
                linkLocation="collection_story"
                className="inline-flex items-center justify-center h-12 px-8 rounded bg-primary text-on-primary text-label-caps hover:bg-primary-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Browse bedspreads
              </TrackedContentLink>
            </div>
          </Reveal>
        </div>
      </TrackedSection>

      <TrackedSection
        sectionId="featured-designs"
        position={3}
        labelledBy="featured-designs-title"
        className="bg-surface-container-low"
      >
        <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-16 md:py-24 lg:py-32">
          <Reveal>
            <div className="flex items-end justify-between gap-6 mb-10 md:mb-14">
              <div>
                <p className="text-label-caps text-primary mb-4">
                  Explore the details
                </p>
                <h2
                  id="featured-designs-title"
                  className="font-display text-headline-md-mobile md:text-headline-md text-on-surface mb-2"
                >
                  Designs to begin with
                </h2>
                <p className="text-body-sm text-on-surface-variant">
                  Open a design to compare its available colourways.
                </p>
              </div>
              <TrackedContentLink
                href="/catalog"
                contentType="homepage_cta"
                contentId="featured_view_all"
                linkLocation="featured_designs"
                className="text-label-caps text-primary hover:underline whitespace-nowrap rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                View all designs
              </TrackedContentLink>
            </div>
          </Reveal>

          <TrackItemList
            items={analyticsItems}
            listName="Homepage designs"
            listId="homepage-designs"
            listKey="homepage-designs"
          />
          {featured.items.length === 0 ? (
            <p className="text-on-surface-variant">
              The collection is temporarily unavailable. Please try again
              shortly.
            </p>
          ) : (
            <StaggerGroup className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-8 md:gap-y-14">
              {featured.items.map((product, index) => {
                const primaryImage = primaryGalleryImage(product);
                const price = lowestPrice(product);

                return (
                  <StaggerItem key={product.id}>
                    <ProductCard
                      slug={product.slug}
                      name={product.name}
                      imageUrl={primaryImage?.url}
                      imageAlt={primaryImage?.alt_text ?? product.name}
                      formattedPrice={
                        price !== null ? formatPrice(price) : null
                      }
                      aspectRatio="3/4"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      priority={index === 0}
                      analytics={{
                        item: analyticsItems[index],
                        listName: 'Homepage designs',
                        listId: 'homepage-designs',
                      }}
                    />
                  </StaggerItem>
                );
              })}
            </StaggerGroup>
          )}
        </div>
      </TrackedSection>

      <TrackedSection
        sectionId="guided-shopping"
        position={4}
        labelledBy="guided-shopping-title"
        className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-16 md:py-24"
      >
        <div className="overflow-hidden rounded-xl bg-inverse-surface px-6 py-12 text-inverse-on-surface md:px-12 md:py-16 lg:px-20">
          <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto]">
            <div className="max-w-3xl">
              <p className="text-label-caps text-inverse-primary mb-4">
                Personal product guidance
              </p>
              <h2
                id="guided-shopping-title"
                className="font-display text-headline-md-mobile md:text-headline-md mb-5"
              >
                Found a design you like? Let&apos;s find the right option.
              </h2>
              <p className="text-body-md text-inverse-on-surface/75">
                Message Sunfabb with the design you are considering. We&apos;ll
                help confirm colours, size, current stock, price and delivery
                before you decide.
              </p>
            </div>
            {whatsappHref ? (
              <TrackedWhatsAppLink
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                tracking={{ linkLocation: 'home_guided_enquiry' }}
                className="inline-flex h-12 items-center justify-center rounded bg-inverse-primary px-8 text-label-caps text-on-primary-fixed hover:bg-primary-fixed-dim transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inverse-primary focus-visible:ring-offset-2 focus-visible:ring-offset-inverse-surface"
              >
                Ask on WhatsApp
              </TrackedWhatsAppLink>
            ) : (
              <TrackedContentLink
                href="/contact"
                contentType="homepage_cta"
                contentId="guided_shopping_contact"
                linkLocation="guided_shopping"
                className="inline-flex h-12 items-center justify-center rounded bg-inverse-primary px-8 text-label-caps text-on-primary-fixed"
              >
                Contact Sunfabb
              </TrackedContentLink>
            )}
          </div>
        </div>
      </TrackedSection>

      <TrackedSection
        sectionId="shopping-help"
        position={5}
        labelledBy="shopping-help-title"
        className="border-t border-outline-variant"
      >
        <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-16 md:py-24">
          <div className="max-w-2xl mb-10">
            <p className="text-label-caps text-primary mb-4">Buy with clarity</p>
            <h2
              id="shopping-help-title"
              className="font-display text-headline-md-mobile md:text-headline-md text-on-surface"
            >
              Helpful details, before you enquire.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                href: '/guides',
                id: 'help_guides',
                title: 'Product guides',
                body: 'Explore practical guidance for choosing and caring for home textiles.',
              },
              {
                href: '/shipping-policy',
                id: 'help_shipping',
                title: 'Shipping information',
                body: 'Review how delivery timing and serviceability are confirmed.',
              },
              {
                href: '/returns-policy',
                id: 'help_returns',
                title: 'Returns information',
                body: 'Understand the working return conditions before placing an order.',
              },
            ].map((item) => (
              <TrackedContentLink
                key={item.id}
                href={item.href}
                contentType="homepage_support"
                contentId={item.id}
                linkLocation="shopping_help"
                className="group rounded-xl border border-outline-variant bg-surface-container-lowest p-6 transition-colors hover:border-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <h3 className="font-display text-title-sm text-on-surface mb-3">
                  {item.title}
                </h3>
                <p className="text-body-sm text-on-surface-variant mb-6">
                  {item.body}
                </p>
                <span className="text-label-caps text-primary group-hover:underline">
                  Read more
                </span>
              </TrackedContentLink>
            ))}
          </div>
        </div>
      </TrackedSection>
    </>
  );
}
