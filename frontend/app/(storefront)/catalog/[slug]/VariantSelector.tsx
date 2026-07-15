"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice, type ProductVariant } from "@/lib/api";
import { useCartStore } from "@/lib/cart-store";

interface VariantSelectorProps {
  variants: ProductVariant[];
  productName: string;
  productSlug: string;
  selectedVariantId: string | null;
  onVariantChange: (variantId: string) => void;
}

function isLoggedIn(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("customer_logged_in="));
}

function uniqueByName<T extends { name: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.name, item])).values());
}

function chooseVariantForSize(
  variants: ProductVariant[],
  size: string,
  current: ProductVariant,
): ProductVariant | undefined {
  const candidates = variants.filter((variant) => variant.size === size);

  return (
    candidates.find(
      (variant) =>
        variant.material.name === current.material.name &&
        variant.color.name === current.color.name,
    ) ??
    candidates.find((variant) => variant.material.name === current.material.name) ??
    candidates.find((variant) => variant.color.name === current.color.name) ??
    candidates[0]
  );
}

function chooseVariantForMaterial(
  variants: ProductVariant[],
  size: string,
  materialName: string,
  currentColorName: string,
): ProductVariant | undefined {
  const candidates = variants.filter(
    (variant) => variant.size === size && variant.material.name === materialName,
  );

  return candidates.find((variant) => variant.color.name === currentColorName) ?? candidates[0];
}

export function VariantSelector({
  variants,
  productName,
  productSlug,
  selectedVariantId,
  onVariantChange,
}: VariantSelectorProps) {
  const [addState, setAddState] = useState<"idle" | "loading" | "added" | "error">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addItem = useCartStore((s) => s.addItem);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? variants[0];

  // Variant choices are hierarchical: size narrows material, and the chosen
  // size/material pair narrows color. Material/color are deduped by name
  // because the embedded API shapes intentionally omit their ids.
  const sizes = Array.from(
    new Map(
      variants.filter((v) => v.size).map((v) => [v.size, v.size])
    ).values()
  );

  const variantsForSize = selectedVariant
    ? variants.filter((variant) => variant.size === selectedVariant.size)
    : [];
  const materials = uniqueByName(
    variantsForSize.map((variant) => variant.material),
  );

  const variantsForMaterial = selectedVariant
    ? variantsForSize.filter(
        (variant) => variant.material.name === selectedVariant.material.name,
      )
    : [];
  const colors = uniqueByName(
    variantsForMaterial.map((variant) => variant.color),
  );

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  function resetAddStateAfterDelay() {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setAddState("idle"), 2000);
  }

  async function handleAddToCart() {
    if (!selectedVariant) return;
    setAddState("loading");

    const variantLabel = [selectedVariant.size, selectedVariant.color.name, selectedVariant.material.name]
      .filter(Boolean)
      .join(" · ");

    try {
      if (isLoggedIn()) {
        const res = await fetch("/api/customer/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantId: selectedVariant.id, quantity: 1 }),
        });
        if (!res.ok) throw new Error("Server error");
      } else {
        addItem({
          variantId: selectedVariant.id,
          quantity: 1,
          productName,
          productSlug,
          variantLabel,
          pricePaise: selectedVariant.price,
        });
      }
      setAddState("added");
      resetAddStateAfterDelay();
    } catch {
      setAddState("error");
      resetAddStateAfterDelay();
    }
  }

  return (
    <div className="space-y-6">
      {/* Price */}
      {selectedVariant && (
        <p className="text-price-lg text-on-surface">
          {formatPrice(selectedVariant.price)}
        </p>
      )}

      {/* Size */}
      {sizes.length > 0 && (
        <div>
          <p className="text-label-caps text-on-surface-variant mb-2">Size</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const isSelected = selectedVariant?.size === size;
              return (
                <button
                  key={size}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    if (!selectedVariant) return;
                    const match = chooseVariantForSize(variants, size, selectedVariant);
                    if (match) onVariantChange(match.id);
                  }}
                  className={`px-4 py-1.5 rounded border text-body-sm transition-colors ${
                    isSelected
                      ? "bg-primary border-primary text-on-primary"
                      : "border-outline-variant text-on-surface hover:border-primary"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Material */}
      {materials.length > 0 && (
        <div>
          <p className="text-label-caps text-on-surface-variant mb-2">Material</p>
          <div className="flex flex-wrap gap-2">
            {materials.map((mat) => {
              const isSelected = selectedVariant?.material.name === mat.name;
              return (
                <button
                  key={mat.name}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    if (!selectedVariant) return;
                    const match = chooseVariantForMaterial(
                      variants,
                      selectedVariant.size,
                      mat.name,
                      selectedVariant.color.name,
                    );
                    if (match) onVariantChange(match.id);
                  }}
                  className={`px-4 py-1.5 rounded border text-body-sm transition-colors ${
                    isSelected
                      ? "bg-primary border-primary text-on-primary"
                      : "border-outline-variant text-on-surface hover:border-primary"
                  }`}
                >
                  {mat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Color */}
      {colors.length > 0 && (
        <div>
          <p className="text-label-caps text-on-surface-variant mb-2">
            Color
            {selectedVariant?.color ? (
              <span className="ml-2 text-on-surface-variant/70">
                — {selectedVariant.color.name}
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((col) => {
              const isSelected = selectedVariant?.color.name === col.name;
              return (
                <button
                  key={col.name}
                  type="button"
                  title={col.name}
                  aria-label={`Select color ${col.name}`}
                  aria-pressed={isSelected}
                  onClick={() => {
                    const match = variants.find(
                      (v) =>
                        v.color.name === col.name &&
                        v.size === selectedVariant?.size &&
                        v.material.name === selectedVariant?.material.name
                    );
                    if (match) onVariantChange(match.id);
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    isSelected
                      ? "border-primary scale-110 ring-2 ring-primary-container ring-offset-1"
                      : "border-outline-variant hover:border-primary"
                  }`}
                  style={{ backgroundColor: col.hex_code ?? undefined }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Stock status */}
      {selectedVariant && (
        <p className="text-body-sm text-on-surface-variant">
          {selectedVariant.stock_quantity > 0 ? (
            <span className="text-tertiary font-medium">In stock</span>
          ) : (
            <span className="text-error font-medium">Out of stock</span>
          )}
        </p>
      )}

      {/* Add to Cart */}
      {selectedVariant && (
        <button
          onClick={handleAddToCart}
          disabled={addState === "loading" || selectedVariant.stock_quantity === 0}
          className={`w-full py-3 rounded text-label-caps transition-all ${
            addState === "added"
              ? "bg-tertiary text-on-primary"
              : addState === "error"
              ? "bg-error text-on-primary"
              : "bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          }`}
        >
          {addState === "loading"
            ? "Adding…"
            : addState === "added"
            ? "Added to Cart ✓"
            : addState === "error"
            ? "Failed — try again"
            : selectedVariant.stock_quantity === 0
            ? "Out of Stock"
            : "Add to Cart"}
        </button>
      )}
    </div>
  );
}
