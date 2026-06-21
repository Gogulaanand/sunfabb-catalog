"use client";

import { useState } from "react";
import { formatPrice, type ProductVariant, type Color, type Material } from "@/lib/api";

interface VariantSelectorProps {
  variants: ProductVariant[];
}

export default function VariantSelector({ variants }: VariantSelectorProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    variants[0]?.id ?? null
  );

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? variants[0];

  // Collect unique sizes, materials, colors
  const sizes = Array.from(
    new Map(
      variants.filter((v) => v.size).map((v) => [v.size!, v.size!])
    ).values()
  );

  const materials = Array.from(
    new Map(
      variants
        .filter((v) => v.material)
        .map((v) => [v.material!.id, v.material!] as [number, Material])
    ).values()
  );

  const colors = Array.from(
    new Map(
      variants
        .filter((v) => v.color)
        .map((v) => [v.color!.id, v.color!] as [number, Color])
    ).values()
  );

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
                        (selectedVariant?.color?.id === undefined ||
                          v.color?.id === selectedVariant.color?.id) &&
                        (selectedVariant?.material?.id === undefined ||
                          v.material?.id === selectedVariant.material?.id)
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
              const isSelected = selectedVariant?.material?.id === mat.id;
              return (
                <button
                  key={mat.id}
                  onClick={() => {
                    const match = variants.find(
                      (v) =>
                        v.material?.id === mat.id &&
                        (selectedVariant?.size === undefined ||
                          v.size === selectedVariant.size) &&
                        (selectedVariant?.color?.id === undefined ||
                          v.color?.id === selectedVariant.color?.id)
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
              const isSelected = selectedVariant?.color?.id === col.id;
              return (
                <button
                  key={col.id}
                  title={col.name}
                  onClick={() => {
                    const match = variants.find(
                      (v) =>
                        v.color?.id === col.id &&
                        (selectedVariant?.size === undefined ||
                          v.size === selectedVariant.size) &&
                        (selectedVariant?.material?.id === undefined ||
                          v.material?.id === selectedVariant.material?.id)
                    );
                    if (match) setSelectedVariantId(match.id);
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    isSelected
                      ? "border-primary scale-110 ring-2 ring-primary-container ring-offset-1"
                      : "border-outline-variant hover:border-primary"
                  }`}
                  style={{ backgroundColor: col.hex_code }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Stock status */}
      {selectedVariant && (
        <p className="text-body-sm text-on-surface-variant">
          {selectedVariant.stock > 0 ? (
            <span className="text-tertiary font-medium">In stock</span>
          ) : (
            <span className="text-error font-medium">Out of stock</span>
          )}
        </p>
      )}
    </div>
  );
}
