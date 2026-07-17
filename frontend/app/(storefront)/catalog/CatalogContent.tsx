import { Suspense } from "react";
import Link from "next/link";
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
import { ItemListSchema } from "@/components/seo/ItemListSchema";
import { ProductCard } from "@/components/product/product-card";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sunfabb.com";

interface CatalogContentProps {
  categorySlug?: string;
  materialId?: string;
  colorId?: string;
  sortBy?: ProductsQuery["sortBy"];
  page: number;
}

export default async function CatalogContent({
  categorySlug,
  materialId,
  colorId,
  sortBy,
  page,
}: CatalogContentProps) {
  const limit = 20;

  const [categories, materials, colors, productsData] = await Promise.all([
    getCategories().catch(() => []),
    getMaterials().catch(() => []),
    getColors().catch(() => []),
    getProducts({ categorySlug, materialId, colorId, sortBy, page, limit }).catch(
      () => ({ items: [], total: 0, page: 1, limit }),
    ),
  ]);

  const { items: products, total } = productsData;
  const totalPages = Math.ceil(total / limit);

  return (
    <>
      {products.length > 0 && (
        <ItemListSchema items={products} siteUrl={siteUrl} />
      )}
      <CatalogTransitionProvider>
        <div className="flex flex-col lg:flex-row gap-(--spacing-gutter-desktop)">
          {/* Filters sidebar */}
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
                Showing {products.length} of {total}{" "}
                {total === 1 ? "item" : "items"}
              </p>

              {products.length === 0 ? (
                <div className="py-20 text-center text-on-surface-variant">
                  <p className="text-title-sm">No products found.</p>
                  <p className="text-body-sm mt-2">
                    Try adjusting your filters.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-(--spacing-gutter-desktop)">
                  {products.map((product) => {
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
                      <ProductCard
                        key={product.id}
                        slug={product.slug}
                        name={product.name}
                        imageUrl={primaryImage?.url}
                        imageAlt={primaryImage?.alt_text ?? product.name}
                        formattedPrice={lowestPrice !== null ? formatPrice(lowestPrice) : null}
                        aspectRatio="square"
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      />
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => {
                      const pageParams = new URLSearchParams();
                      if (categorySlug)
                        pageParams.set("category", categorySlug);
                      if (materialId !== undefined)
                        pageParams.set("material", String(materialId));
                      if (colorId !== undefined)
                        pageParams.set("color", String(colorId));
                      if (sortBy) pageParams.set("sort", sortBy);
                      pageParams.set("page", String(p));

                      return (
                        <Link
                          key={p}
                          href={`/catalog?${pageParams.toString()}`}
                          className={`w-9 h-9 flex items-center justify-center rounded text-body-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                            p === page
                              ? "bg-primary text-on-primary"
                              : "border border-outline-variant text-on-surface-variant hover:border-primary"
                          }`}
                        >
                          {p}
                        </Link>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          </CatalogPendingGrid>
        </div>
      </CatalogTransitionProvider>
    </>
  );
}
