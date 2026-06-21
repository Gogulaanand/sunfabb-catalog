import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getProduct, getProducts, formatPrice } from "@/lib/api";
import VariantSelector from "./VariantSelector";

export const revalidate = 30;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const { items } = await getProducts({ limit: 100 }).catch(() => ({
    items: [],
    total: 0,
    page: 1,
    limit: 100,
  }));
  return items.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) return { title: "Product not found — Sunfabb" };
  return {
    title: `${product.name} — Sunfabb`,
    description: product.description ?? undefined,
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);

  if (!product) notFound();

  const sortedImages = [...product.images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.display_order - b.display_order;
  });

  const primaryImage = sortedImages[0];

  const related = (
    await getProducts({ categorySlug: product.category.slug, limit: 5 }).catch(() => ({
      items: [],
      total: 0,
      page: 1,
      limit: 5,
    }))
  ).items.filter((p) => p.slug !== product.slug).slice(0, 4);

  return (
    <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-(--spacing-margin-mobile) md:py-16">
      {/* Breadcrumb */}
      <nav className="text-body-sm text-on-surface-variant mb-8">
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/catalog?category=${product.category.slug}`}
          className="hover:text-primary transition-colors"
        >
          {product.category.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-on-surface">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-(--spacing-gutter-desktop)">
        {/* Images */}
        <div className="space-y-3">
          {primaryImage ? (
            <div className="relative aspect-square rounded-md overflow-hidden bg-surface-container">
              <Image
                src={primaryImage.url}
                alt={primaryImage.alt_text ?? product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
          ) : (
            <div className="aspect-square rounded-md bg-surface-container flex items-center justify-center text-outline text-7xl">
              🧵
            </div>
          )}

          {/* Thumbnail strip */}
          {sortedImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {sortedImages.map((img) => (
                <div
                  key={img.id}
                  className="relative w-20 h-20 shrink-0 rounded overflow-hidden bg-surface-container border border-outline-variant"
                >
                  <Image
                    src={img.url}
                    alt={img.alt_text ?? product.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <p className="text-label-caps text-primary mb-2">{product.category.name}</p>
            <h1 className="font-display text-headline-md-mobile md:text-headline-md text-on-surface">
              {product.name}
            </h1>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Variant selector (client component) */}
          {product.variants.length > 0 ? (
            <VariantSelector variants={product.variants} />
          ) : (
            <p className="text-on-surface-variant text-body-sm">No variants available.</p>
          )}

          {/* Care instructions */}
          {product.care_instructions && (
            <div className="pt-6 border-t border-outline-variant">
              <h2 className="text-title-sm text-on-surface mb-2">Care Instructions</h2>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                {product.care_instructions}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Complete the look */}
      {related.length > 0 && (
        <div className="mt-(--spacing-margin-mobile) md:mt-20">
          <div className="flex items-baseline justify-between mb-10">
            <h2 className="font-display text-headline-md-mobile md:text-headline-md text-on-surface">
              Complete the Look
            </h2>
            <Link
              href={`/catalog?category=${product.category.slug}`}
              className="text-label-caps text-primary hover:underline whitespace-nowrap"
            >
              Shop All
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-(--spacing-gutter-mobile) md:gap-(--spacing-gutter-desktop)">
            {related.map((item) => {
              const itemImage = item.images.find((img) => img.is_primary) ?? item.images[0];
              const lowestPrice = item.variants.length
                ? Math.min(...item.variants.map((v) => v.price))
                : null;

              return (
                <Link key={item.id} href={`/catalog/${item.slug}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-surface-container mb-3">
                    {itemImage ? (
                      <Image
                        src={itemImage.url}
                        alt={itemImage.alt_text ?? item.name}
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
                  <p className="text-title-sm text-on-surface">{item.name}</p>
                  {lowestPrice !== null && (
                    <p className="text-price-lg text-on-surface-variant">
                      {formatPrice(lowestPrice)}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
