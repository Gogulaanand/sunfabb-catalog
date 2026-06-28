"use client";

import { useState } from "react";
import { formatPrice, type ProductVariant } from "@/lib/api";
import { useCartStore } from "@/lib/cart-store";

interface VariantSelectorProps {
  variants: ProductVariant[];
  productName: string;
  productSlug: string;
}

function isLoggedIn(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("customer_logged_in="));
}

export default function VariantSelector({ variants, productName, productSlug }: VariantSelectorProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants[0]?.id ?? null
  );
  const [addState, setAddState] = useState<"idle" | "loading" | "added" | "error">("idle");

  const addItem = useCartStore((s) => s.addItem);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? variants[0];

  // Collect unique sizes, materials, colors. The material/color embedded on a
  // variant has no id (the backend only selects name/hex_code there — see
  // lib/api.ts), so dedupe by name, which is unique per Material/Color row.
  const sizes = Array.from(
    new Map(
      variants.filter((v) => v.size).map((v) => [v.size, v.size])
    ).values()
  );

  const materials = Array.from(
    new Map(variants.map((v) => [v.material.name, v.material])).values()
  );

  const colors = Array.from(
    new Map(variants.map((v) => [v.color.name, v.color])).values()
  );

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
      setTimeout(() => setAddState("idle"), 2000);
    } catch {
      setAddState("error");
      setTimeout(() => setAddState("idle"), 2000);
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
                  onClick={() => {
                    const match = variants.find(
                      (v) =>
                        v.size === size &&
                        v.color.name === selectedVariant?.color.name &&
                        v.material.name === selectedVariant?.material.name
                    );
                    if (match) setSelectedVariantId(match.id);
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
                  onClick={() => {
                    const match = variants.find(
                      (v) =>
                        v.material.name === mat.name &&
                        v.size === selectedVariant?.size &&
                        v.color.name === selectedVariant?.color.name
                    );
                    if (match) setSelectedVariantId(match.id);
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
                  title={col.name}
                  onClick={() => {
                    const match = variants.find(
                      (v) =>
                        v.color.name === col.name &&
                        v.size === selectedVariant?.size &&
                        v.material.name === selectedVariant?.material.name
                    );
                    if (match) setSelectedVariantId(match.id);
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
