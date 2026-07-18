"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect, useId } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Category, Material, Color } from "@/lib/api";
import { useCatalogTransition } from "./CatalogTransitionContext";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface CatalogFiltersProps {
  categories: Category[];
  materials: Material[];
  colors: Color[];
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      className="w-3 h-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 6l3 3 5-5" />
    </svg>
  );
}

interface CheckItemProps {
  checked: boolean;
  onChange: () => void;
  label: string;
}

function CheckItem({ checked, onChange, label }: CheckItemProps) {
  return (
    <label className="flex items-center gap-3 text-body-sm text-on-surface cursor-pointer group select-none">
      {/* Native input sits inside a sized container so Playwright can click it by role.
          opacity-[0.01] keeps it invisible to users without triggering Playwright's
          "element is not visible" guard (which fires on opacity:0 / sr-only clip). */}
      <span className="relative w-4 h-4 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="absolute inset-0 w-full h-full opacity-[0.01] cursor-pointer m-0"
        />
        <span
          aria-hidden="true"
          className={`absolute inset-0 rounded border-[1.5px] flex items-center justify-center pointer-events-none transition-colors duration-150 ${
            checked
              ? "bg-primary border-primary text-on-primary"
              : "border-outline-variant group-hover:border-primary"
          }`}
        >
          {checked && <CheckIcon />}
        </span>
      </span>
      <span>{label}</span>
    </label>
  );
}

interface ActiveBadgeProps {
  count: number;
}

function ActiveBadge({ count }: ActiveBadgeProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-on-primary text-[10px] font-semibold"
        >
          {count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export default function CatalogFilters({
  categories,
  materials,
  colors,
}: CatalogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startCatalogTransition } = useCatalogTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerId = useId();

  const currentCategory = searchParams.get("category") ?? "";
  const currentMaterial = searchParams.get("material") ?? "";
  const currentColor = searchParams.get("color") ?? "";
  const currentSort = searchParams.get("sort") ?? "";

  const activeCount = [currentCategory, currentMaterial, currentColor].filter(
    Boolean,
  ).length;

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      startCatalogTransition(() => {
        router.push(`/catalog?${params.toString()}`);
      });
    },
    [router, searchParams, startCatalogTransition],
  );

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drawerOpen]);

  const filterSections = (
    <>
      <section>
        <h3 className="text-label-caps text-on-surface-variant mb-3">
          Sort by
        </h3>
        <select
          value={currentSort}
          onChange={(e) => updateParam("sort", e.target.value || null)}
          className="w-full rounded border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Newest Arrivals</option>
          <option value="name">Name (A-Z)</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </section>

      <section>
        <h3 className="text-label-caps text-on-surface-variant mb-3">
          Category
        </h3>
        <div className="space-y-3">
          <CheckItem
            checked={!currentCategory}
            onChange={() => updateParam("category", null)}
            label="All"
          />
          {categories.map((cat) => (
            <CheckItem
              key={cat.id}
              checked={currentCategory === cat.slug}
              onChange={() =>
                updateParam(
                  "category",
                  currentCategory === cat.slug ? null : cat.slug,
                )
              }
              label={cat.name}
            />
          ))}
        </div>
      </section>

      {materials.length > 0 && (
        <section>
          <h3 className="text-label-caps text-on-surface-variant mb-3">
            Material
          </h3>
          <div className="space-y-3">
            <CheckItem
              checked={!currentMaterial}
              onChange={() => updateParam("material", null)}
              label="All"
            />
            {materials.map((mat) => (
              <CheckItem
                key={mat.id}
                checked={currentMaterial === String(mat.id)}
                onChange={() =>
                  updateParam(
                    "material",
                    currentMaterial === String(mat.id) ? null : String(mat.id),
                  )
                }
                label={mat.name}
              />
            ))}
          </div>
        </section>
      )}

      {colors.length > 0 && (
        <section>
          <h3 className="text-label-caps text-on-surface-variant mb-3">
            Color Palette
          </h3>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((col) => (
              <motion.button
                key={col.id}
                title={col.name}
                onClick={() =>
                  updateParam(
                    "color",
                    currentColor === String(col.id) ? null : String(col.id),
                  )
                }
                aria-pressed={currentColor === String(col.id)}
                aria-label={col.name}
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.15 }}
                className={`w-7 h-7 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  currentColor === String(col.id)
                    ? "border-primary"
                    : "border-outline-variant"
                }`}
                style={{ backgroundColor: col.hex_code ?? undefined }}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );

  return (
    <aside className="w-full lg:w-56 shrink-0">
      {/* Mobile trigger */}
      <button
        className="lg:hidden mb-6 w-full flex items-center justify-between py-3 px-4 border border-outline-variant rounded-md text-on-surface hover:border-primary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => setDrawerOpen(true)}
        aria-expanded={drawerOpen}
        aria-controls={drawerId}
        aria-haspopup="dialog"
      >
        <span className="flex items-center gap-2 text-label-caps">
          Filter & Sort
          <ActiveBadge count={activeCount} />
        </span>
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 text-on-surface-variant"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="16" y2="12" />
          <line x1="4" y1="18" x2="12" y2="18" />
        </svg>
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              id={drawerId}
              role="dialog"
              aria-modal="true"
              aria-label="Filter & Sort"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
              className="fixed bottom-0 inset-x-0 z-50 bg-surface rounded-t-2xl max-h-[85vh] overflow-y-auto lg:hidden"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-outline-variant" />
              </div>
              <div className="flex items-center justify-between px-6 py-3 border-b border-outline-variant">
                <span className="flex items-center gap-2 text-label-caps text-on-surface">
                  Filter & Sort
                  <ActiveBadge count={activeCount} />
                </span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Close filters"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-8 p-6">
                {filterSections}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:block space-y-8">{filterSections}</div>
    </aside>
  );
}
