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
import { constrainCatalogQuery } from "@/lib/catalog-query";
import CatalogFilters from "./CatalogFilters";
import CatalogPendingGrid from "./CatalogPendingGrid";
import { CatalogTransitionProvider } from "./CatalogTransitionContext";
import { CatalogResultCount } from "./CatalogResultCount";
import { CatalogEmptyState } from "./CatalogEmptyState";
import { ItemListSchema } from "@/components/seo/ItemListSchema";
import { ProductCard } from "@/components/product/product-card";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { TrackItemList } from "@/components/analytics/track-item-list";
import type { AnalyticsItem } from "@/lib/analytics";

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

  const [categories, materials, colors] = await Promise.all([
    getCategories().catch(() => []),
    getMaterials().catch(() => []),
    getColors().catch(() => []),
  ]);

  const query = constrainCatalogQuery(
    { categorySlug, materialId, colorId, sortBy, page },
    {
      categorySlugs: categories.map((category) => category.slug),
      materialIds: materials.map((material) => material.id),
      colorIds: colors.map((color) => color.id),
    },
  );
  const productsData = await getProducts({ ...query, limit });

  const { items: products, total } = productsData;
  const totalPages = Math.ceil(total / limit);
  const hasFilters = Boolean(
    query.categorySlug || query.materialId || query.colorId,
  );
  const gridKey = [
    query.categorySlug,
    query.materialId,
    query.colorId,
    query.sortBy,
    query.page,
  ].join("-");

  // A card has no selected variant, so the item is the product and the price
  // is the cheapest variant's — the same number the card shows. `index` is
  // absolute across pages, not per-page, so page 2 does not report positions
  // 1-20 a second time.
  const analyticsItems: AnalyticsItem[] = products.map((product, i) => ({
    item_id: product.id,
    item_name: product.name,
    price_paise: product.variants.length
      ? Math.min(...product.variants.map((v) => v.price))
      : 0,
    item_category: product.category.name,
    index: (query.page - 1) * limit + i + 1,
  }));

  return (
    <>
      {products.length > 0 && (
        <ItemListSchema items={products} siteUrl={siteUrl} />
      )}
      <TrackItemList
        items={analyticsItems}
        listName={
          query.categorySlug ? `Catalog: ${query.categorySlug}` : "Catalog"
        }
        listId={gridKey}
        listKey={gridKey}
      />
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
              <CatalogResultCount showing={products.length} total={total} />

              {products.length === 0 ? (
                <CatalogEmptyState hasFilters={hasFilters} />
              ) : (
                <StaggerGroup
                  key={gridKey}
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-(--spacing-gutter-desktop)"
                >
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
                      <StaggerItem key={product.id}>
                        <ProductCard
                          slug={product.slug}
                          name={product.name}
                          imageUrl={primaryImage?.url}
                          imageAlt={primaryImage?.alt_text ?? product.name}
                          formattedPrice={
                            lowestPrice !== null
                              ? formatPrice(lowestPrice)
                              : null
                          }
                          aspectRatio="square"
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        />
                      </StaggerItem>
                    );
                  })}
                </StaggerGroup>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => {
                      const pageParams = new URLSearchParams();
                      if (query.categorySlug)
                        pageParams.set("category", query.categorySlug);
                      if (query.materialId !== undefined)
                        pageParams.set("material", query.materialId);
                      if (query.colorId !== undefined)
                        pageParams.set("color", query.colorId);
                      if (query.sortBy) pageParams.set("sort", query.sortBy);
                      pageParams.set("page", String(p));

                      return (
                        <Link
                          key={p}
                          href={`/catalog?${pageParams.toString()}`}
                          className={`w-9 h-9 flex items-center justify-center rounded text-body-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                            p === query.page
                              ? "bg-primary text-on-primary shadow-sm scale-105"
                              : "border border-outline-variant text-on-surface-variant hover:border-primary hover:text-on-surface hover:bg-surface-container active:scale-95"
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
