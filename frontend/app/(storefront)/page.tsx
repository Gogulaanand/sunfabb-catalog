import Link from "next/link";
import Image from "next/image";
import { getCategories, getProducts, formatPrice } from "@/lib/api";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1920&q=75";

export default async function HomePage() {
  const [categories, featured] = await Promise.all([
    getCategories().catch(() => []),
    getProducts({ limit: 4 }).catch(() => ({ items: [], total: 0, page: 1, limit: 4 })),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative h-[640px] flex items-center justify-center overflow-hidden">
        <Image
          src={HERO_IMAGE}
          alt="Linen bedspread styled in a sun-lit bedroom"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-on-surface/10" />
        <div className="relative z-10 max-w-md mx-4 bg-surface/95 rounded-lg px-10 py-10 text-center shadow-lg">
          <h1 className="font-display text-display-lg-mobile md:text-display-lg text-on-surface mb-3">
            Crafted for Comfort
          </h1>
          <p className="text-body-sm text-on-surface-variant mb-6">
            Premium bedspreads, towels, napkins and table linen — made in India, built to last.
          </p>
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center h-11 px-8 rounded bg-primary text-on-primary text-label-caps hover:bg-primary-container transition-colors"
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* Curated collections */}
      <section className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-(--spacing-margin-mobile) md:py-20">
        <h2 className="font-display text-headline-md-mobile md:text-headline-md text-center text-on-surface mb-10">
          Curated Collections
        </h2>

        {categories.length === 0 ? (
          <p className="text-on-surface-variant text-center">No categories found.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-(--spacing-gutter-mobile) md:gap-(--spacing-gutter-desktop)">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/catalog?category=${category.slug}`}
                className="group block"
              >
                <div className="relative aspect-square overflow-hidden rounded-md bg-surface-container mb-3">
                  {category.image_url ? (
                    <Image
                      src={category.image_url}
                      alt={category.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-outline text-4xl">
                      🪡
                    </div>
                  )}
                </div>
                <p className="text-title-sm text-on-surface text-center">{category.name}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured pieces */}
      <section className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-(--spacing-margin-mobile) md:py-20">
        <div className="flex items-baseline justify-between mb-10">
          <div>
            <h2 className="font-display text-headline-md-mobile md:text-headline-md text-on-surface mb-1">
              Featured Pieces
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Thoughtfully sourced, quietly luxurious
            </p>
          </div>
          <Link href="/catalog" className="text-label-caps text-primary hover:underline whitespace-nowrap">
            Shop All
          </Link>
        </div>

        {featured.items.length === 0 ? (
          <p className="text-on-surface-variant">No products found.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-(--spacing-gutter-mobile) md:gap-(--spacing-gutter-desktop)">
            {featured.items.map((product) => {
              const primaryImage =
                product.images.find((img) => img.is_primary) ?? product.images[0];
              const lowestPrice = product.variants.length
                ? Math.min(...product.variants.map((v) => v.price))
                : null;

              return (
                <Link key={product.id} href={`/catalog/${product.slug}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-surface-container mb-3">
                    {primaryImage ? (
                      <Image
                        src={primaryImage.url}
                        alt={primaryImage.alt_text ?? product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-outline text-4xl">
                        🧵
                      </div>
                    )}
                  </div>
                  <p className="text-title-sm text-on-surface">{product.name}</p>
                  {lowestPrice !== null && (
                    <p className="text-price-lg text-on-surface-variant">
                      {formatPrice(lowestPrice)}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
