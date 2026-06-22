"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { Category, Material, Color } from "@/lib/api";
import { useCatalogTransition } from "./CatalogTransitionContext";

interface CatalogFiltersProps {
  categories: Category[];
  materials: Material[];
  colors: Color[];
}

export default function CatalogFilters({
  categories,
  materials,
  colors,
}: CatalogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startCatalogTransition } = useCatalogTransition();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 when filter changes
      params.delete("page");
      startCatalogTransition(() => {
        router.push(`/catalog?${params.toString()}`);
      });
    },
    [router, searchParams, startCatalogTransition]
  );

  const currentCategory = searchParams.get("category") ?? "";
  const currentMaterial = searchParams.get("material") ?? "";
  const currentColor = searchParams.get("color") ?? "";
  const currentSort = searchParams.get("sort") ?? "";

  const filterContent = (
    <>
      {/* Sort */}
      <div>
        <label className="block text-label-caps text-on-surface-variant mb-2">
          Sort by
        </label>
        <select
          value={currentSort}
          onChange={(e) => updateParam("sort", e.target.value || null)}
          className="w-full rounded border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Newest Arrivals</option>
          <option value="name">Name (A–Z)</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {/* Category filter */}
      <div>
        <label className="block text-label-caps text-on-surface-variant mb-3">
          Category
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-body-sm text-on-surface cursor-pointer">
            <input
              type="checkbox"
              checked={!currentCategory}
              onChange={() => updateParam("category", null)}
              className="accent-primary w-4 h-4"
            />
            All
          </label>
          {categories.map((cat) => (
            <label
              key={cat.id}
              className="flex items-center gap-2 text-body-sm text-on-surface cursor-pointer"
            >
              <input
                type="checkbox"
                checked={currentCategory === cat.slug}
                onChange={() =>
                  updateParam("category", currentCategory === cat.slug ? null : cat.slug)
                }
                className="accent-primary w-4 h-4"
              />
              {cat.name}
            </label>
          ))}
        </div>
      </div>

      {/* Material filter */}
      {materials.length > 0 && (
        <div>
          <label className="block text-label-caps text-on-surface-variant mb-3">
            Material
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-body-sm text-on-surface cursor-pointer">
              <input
                type="checkbox"
                checked={!currentMaterial}
                onChange={() => updateParam("material", null)}
                className="accent-primary w-4 h-4"
              />
              All
            </label>
            {materials.map((mat) => (
              <label
                key={mat.id}
                className="flex items-center gap-2 text-body-sm text-on-surface cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={currentMaterial === String(mat.id)}
                  onChange={() =>
                    updateParam(
                      "material",
                      currentMaterial === String(mat.id) ? null : String(mat.id)
                    )
                  }
                  className="accent-primary w-4 h-4"
                />
                {mat.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Color filter */}
      {colors.length > 0 && (
        <div>
          <label className="block text-label-caps text-on-surface-variant mb-3">
            Color Palette
          </label>
          <div className="flex flex-wrap gap-2">
            {colors.map((col) => (
              <button
                key={col.id}
                title={col.name}
                onClick={() =>
                  updateParam(
                    "color",
                    currentColor === String(col.id) ? null : String(col.id)
                  )
                }
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  currentColor === String(col.id)
                    ? "border-primary scale-110"
                    : "border-outline-variant hover:border-primary"
                }`}
                style={{ backgroundColor: col.hex_code ?? undefined }}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <aside className="w-full lg:w-56 shrink-0">
      <details className="lg:hidden mb-6 group">
        <summary className="flex items-center justify-between cursor-pointer py-3 px-4 border border-outline-variant rounded-md text-label-caps text-on-surface list-none">
          <span>Filter & Sort</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-on-surface-variant transition-transform group-open:rotate-180"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <div className="space-y-8 pt-6">{filterContent}</div>
      </details>
      <div className="hidden lg:block space-y-8">{filterContent}</div>
    </aside>
  );
}
