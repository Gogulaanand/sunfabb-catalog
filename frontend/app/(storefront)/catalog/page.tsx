import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  getCategories,
  getMaterials,
  getColors,
  getProducts,
  formatPrice,
  type ProductsQuery,
} from "@/lib/api";
import CatalogFilters from "./CatalogFilters";
import CatalogPendingGrid from "./CatalogPendingGrid";
import { CatalogTransitionProvider } from "./CatalogTransitionContext";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata = {
  title: "Catalog — Sunfabb",
  description: "Browse our full range of home textiles.",
};

export default async function CatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const categorySlug = typeof params.category === "string" ? params.category : undefined;
  const materialId = typeof params.material === "string" ? Number(params.material) : undefined;
  const colorId = typeof params.color === "string" ? Number(params.color) : undefined;
  const sortBy = (typeof params.sort === "string" ? params.sort : undefined) as
    | ProductsQuery["sortBy"]
    | undefined;
  const page = typeof params.page === "string" ? Number(params.page) : 1;
  const limit = 20;

  const [categories, materials, colors, productsData] = await Promise.all([
    getCategories().catch(() => []),
    getMaterials().catch(() => []),
    getColors().catch(() => []),
    getProducts({ categorySlug, materialId, colorId, sortBy, page, limit }).catch(() => ({
      items: [],
      total: 0,
      page: 1,
      limit,
    })),
  ]);

  const { items: products, total } = productsData;
  const totalPages = Math.ceil(total / limit);

  const categoryName = categories.find((c) => c.slug === categorySlug)?.name;

  return (
    <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-(--spacing-margin-mobile) md:py-16">
      {/* Breadcrumb */}
      <nav className="text-body-sm text-on-surface-variant mb-6">
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-on-surface">{categoryName ?? "All Products"}</span>
      </nav>

      <h1 className="font-display text-headline-md-mobile md:text-headline-md text-on-surface mb-2">
        {categoryName ? `The ${categoryName} Collection` : "All Products"}
      </h1>
      <p className="text-body-md text-on-surface-variant mb-10 max-w-2xl">
        Elevate your everyday with sustainably sourced, premium woven textiles.
      </p>

      <CatalogTransitionProvider>
      <div className="flex flex-col lg:flex-row gap-(--spacing-gutter-desktop)">
        {/* Filters sidebar — needs client interactivity */}
        <Suspense fallback={<div className="w-full lg:w-56 shrink-0" />}>
          <CatalogFilters
            categories={categories}
            materials={materials}
            colors={colors}
          />
        </Suspense>

        {/* Product grid */}
        <CatalogPendingGrid>
        <div className="flex-1 min-w-0">
          <p className="text-body-sm text-on-surface-variant mb-6">
            Showing {products.length} of {total} {total === 1 ? "item" : "items"}
          </p>

          {products.length === 0 ? (
            <div className="py-20 text-center text-on-surface-variant">
              <p className="text-title-sm">No products found.</p>
              <p className="text-body-sm mt-2">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-(--spacing-gutter-desktop)">
              {products.map((product) => {
                const primaryImage =
                  product.images.find((img) => img.is_primary) ?? product.images[0];
                const lowestPrice = product.variants.length
                  ? Math.min(...product.variants.map((v) => v.price))
                  : null;

                return (
                  <Link
                    key={product.id}
                    href={`/catalog/${product.slug}`}
                    className="group block"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-md bg-surface-container mb-3">
                      {primaryImage ? (
                        <Image
                          src={primaryImage.url}
                          alt={primaryImage.alt_text ?? product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-outline text-5xl">
                          🧵
                        </div>
                      )}
                    </div>
                    <h3 className="text-title-sm text-on-surface">{product.name}</h3>
                    {lowestPrice !== null && (
                      <p className="text-price-lg text-on-surface-variant mt-1">
                        {formatPrice(lowestPrice)}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const pageParams = new URLSearchParams();
                if (categorySlug) pageParams.set("category", categorySlug);
                if (materialId !== undefined) pageParams.set("material", String(materialId));
                if (colorId !== undefined) pageParams.set("color", String(colorId));
                if (sortBy) pageParams.set("sort", sortBy);
                pageParams.set("page", String(p));

                return (
                  <Link
                    key={p}
                    href={`/catalog?${pageParams.toString()}`}
                    className={`w-9 h-9 flex items-center justify-center rounded text-body-sm transition-colors ${
                      p === page
                        ? "bg-primary text-on-primary"
                        : "border border-outline-variant text-on-surface-variant hover:border-primary"
                    }`}
                  >
                    {p}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        </CatalogPendingGrid>
      </div>
      </CatalogTransitionProvider>
    </div>
  );
}
