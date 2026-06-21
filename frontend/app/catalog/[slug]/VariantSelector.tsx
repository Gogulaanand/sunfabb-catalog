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
    <div className="space-y-5">
      {/* Price */}
      {selectedVariant && (
        <p className="text-2xl font-semibold text-zinc-900">
          {formatPrice(selectedVariant.price)}
        </p>
      )}

      {/* Size */}
      {sizes.length > 0 && (
        <div>
          <p className="text-sm font-medium text-zinc-700 mb-2">Size</p>
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
                  className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                    isSelected
                      ? "bg-zinc-900 border-zinc-900 text-white"
                      : "border-zinc-300 text-zinc-700 hover:border-zinc-500"
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
          <p className="text-sm font-medium text-zinc-700 mb-2">Material</p>
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
                  className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                    isSelected
                      ? "bg-zinc-900 border-zinc-900 text-white"
                      : "border-zinc-300 text-zinc-700 hover:border-zinc-500"
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
          <p className="text-sm font-medium text-zinc-700 mb-2">
            Color
            {selectedVariant?.color ? (
              <span className="ml-2 font-normal text-zinc-500">
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
                      ? "border-zinc-900 scale-110 ring-2 ring-zinc-400 ring-offset-1"
                      : "border-zinc-300 hover:border-zinc-500"
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
        <p className="text-sm text-zinc-500">
          {selectedVariant.stock > 0 ? (
            <span className="text-green-600 font-medium">In stock</span>
          ) : (
            <span className="text-red-500 font-medium">Out of stock</span>
          )}
        </p>
      )}
    </div>
  );
}
