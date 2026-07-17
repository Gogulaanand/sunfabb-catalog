import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getCategories, getProducts, formatPrice } from "@/lib/api";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion";
import { ProductCard } from "@/components/product/product-card";
import { HeroSection } from "@/components/home/hero-section";

export const metadata: Metadata = {
  title: {
    absolute:
      "Sunfabb - Premium Cotton Bedspreads, Towels & Table Linen Online India",
  },
  description:
    "Shop premium handcrafted home textiles from India. Sunfabb brings you bedspreads, towels, napkins and table linen crafted for comfort and lasting quality.",
  openGraph: {
    title:
      "Sunfabb - Premium Cotton Bedspreads, Towels & Table Linen Online India",
    description:
      "Shop premium handcrafted home textiles from India. Crafted for comfort, built to last.",
    url: "/",
  },
};

export default async function HomePage() {
  const [categories, featured] = await Promise.all([
    getCategories().catch(() => []),
    getProducts({ limit: 4 }).catch(() => ({
      items: [],
      total: 0,
      page: 1,
      limit: 4,
    })),
  ]);

  return (
    <>
      <HeroSection />

      {/* Curated Collections */}
      <section className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-14 md:py-24 lg:py-32">
        <Reveal>
          <div className="mb-10 md:mb-14 text-center">
            <h2 className="font-display text-headline-md-mobile md:text-headline-md text-on-surface mb-2">
              Curated Collections
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Each piece chosen for craft and character
            </p>
          </div>
        </Reveal>

        {categories.length === 0 ? (
          <p className="text-on-surface-variant text-center">
            No categories found.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
            {/* Feature tile - full width banner */}
            {categories[0] && (
              <Link
                href={`/catalog?category=${categories[0].slug}`}
                className="group col-span-2 md:col-span-3 relative overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <div className="relative w-full aspect-[3/2] md:aspect-[3/1] overflow-hidden">
                  {categories[0].image_url ? (
                    <Image
                      src={categories[0].image_url}
                      alt={categories[0].name}
                      fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                      sizes="(max-width: 768px) 100vw, 100vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface-container text-outline text-6xl">
                      🪡
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 translate-y-0.5 group-hover:translate-y-0 transition-transform duration-300 ease-out">
                    <p className="font-display text-white text-headline-md-mobile md:text-headline-md">
                      {categories[0].name}
                    </p>
                    <p className="text-white/70 text-label-caps mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      View Collection
                    </p>
                  </div>
                </div>
              </Link>
            )}

            {/* Remaining editorial tiles */}
            {categories.slice(1, 5).map((category) => (
              <Link
                key={category.id}
                href={`/catalog?category=${category.slug}`}
                className="group relative overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <div className="relative w-full aspect-[3/4] overflow-hidden">
                  {category.image_url ? (
                    <Image
                      src={category.image_url}
                      alt={category.name}
                      fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface-container text-outline text-5xl">
                      🪡
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 translate-y-0.5 group-hover:translate-y-0 transition-transform duration-300 ease-out">
                    <p className="font-display text-white text-title-sm">
                      {category.name}
                    </p>
                    <p className="text-white/70 text-label-caps mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      View Collection
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured Pieces */}
      <section className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-14 md:py-24 lg:py-32">
        <Reveal>
          <div className="flex items-baseline justify-between mb-10 md:mb-14">
            <div>
              <h2 className="font-display text-headline-md-mobile md:text-headline-md text-on-surface mb-1">
                Featured Pieces
              </h2>
              <p className="text-body-sm text-on-surface-variant">
                Thoughtfully sourced, quietly luxurious
              </p>
            </div>
            <Link
              href="/catalog"
              className="text-label-caps text-primary hover:underline whitespace-nowrap rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Shop All
            </Link>
          </div>
        </Reveal>

        {featured.items.length === 0 ? (
          <p className="text-on-surface-variant">No products found.</p>
        ) : (
          <StaggerGroup className="grid grid-cols-2 md:grid-cols-4 gap-(--spacing-gutter-mobile) md:gap-(--spacing-gutter-desktop)">
            {featured.items.map((product) => {
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
                    aspectRatio="3/4"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </StaggerItem>
              );
            })}
          </StaggerGroup>
        )}
      </section>
    </>
  );
}
