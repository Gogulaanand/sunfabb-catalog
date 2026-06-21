"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { Category, Material, Color } from "@/lib/api";

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
      router.push(`/catalog?${params.toString()}`);
    },
    [router, searchParams]
  );

  const currentCategory = searchParams.get("category") ?? "";
  const currentMaterial = searchParams.get("material") ?? "";
  const currentColor = searchParams.get("color") ?? "";
  const currentSort = searchParams.get("sort") ?? "";

  return (
    <aside className="w-full lg:w-60 shrink-0 space-y-6">
      {/* Sort */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Sort by
        </label>
        <select
          value={currentSort}
          onChange={(e) => updateParam("sort", e.target.value || null)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        >
          <option value="">Default</option>
          <option value="name">Name (A–Z)</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {/* Category filter */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Category
        </label>
        <div className="space-y-1">
          <button
            onClick={() => updateParam("category", null)}
            className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
              !currentCategory
                ? "bg-zinc-900 text-white"
                : "text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                updateParam(
                  "category",
                  currentCategory === cat.slug ? null : cat.slug
                )
              }
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                currentCategory === cat.slug
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Material filter */}
      {materials.length > 0 && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Material
          </label>
          <div className="space-y-1">
            <button
              onClick={() => updateParam("material", null)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                !currentMaterial
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              All
            </button>
            {materials.map((mat) => (
              <button
                key={mat.id}
                onClick={() =>
                  updateParam(
                    "material",
                    currentMaterial === String(mat.id) ? null : String(mat.id)
                  )
                }
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  currentMaterial === String(mat.id)
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {mat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Color filter */}
      {colors.length > 0 && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Color
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
                    ? "border-zinc-900 scale-110"
                    : "border-zinc-300 hover:border-zinc-500"
                }`}
                style={{ backgroundColor: col.hex_code }}
              />
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
