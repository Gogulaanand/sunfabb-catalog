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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-8">Catalog</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters sidebar — needs client interactivity */}
        <Suspense fallback={<div className="w-60 shrink-0" />}>
          <CatalogFilters
            categories={categories}
            materials={materials}
            colors={colors}
          />
        </Suspense>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-500 mb-6">
            {total} {total === 1 ? "product" : "products"}
            {categorySlug ? ` in "${categorySlug}"` : ""}
          </p>

          {products.length === 0 ? (
            <div className="py-20 text-center text-zinc-500">
              <p className="text-lg">No products found.</p>
              <p className="text-sm mt-2">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
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
                    className="group rounded-2xl border border-zinc-200 overflow-hidden hover:border-zinc-400 transition-colors bg-white"
                  >
                    <div className="relative aspect-square overflow-hidden bg-zinc-100">
                      {primaryImage ? (
                        <Image
                          src={primaryImage.url}
                          alt={primaryImage.alt_text ?? product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-300 text-5xl">
                          🧵
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">
                        {product.category.name}
                      </p>
                      <h3 className="font-semibold text-zinc-900 group-hover:text-zinc-700 transition-colors line-clamp-1">
                        {product.name}
                      </h3>
                      {lowestPrice !== null && (
                        <p className="mt-1 text-sm font-medium text-zinc-700">
                          From {formatPrice(lowestPrice)}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
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
                    className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      p === page
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {p}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
