"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { ProductImage, ProductVariant } from "@/lib/api";
import { ProductGallery } from "./ProductGallery";
import VariantSelector from "./VariantSelector";

interface ProductDetailInteractiveProps {
  images: ProductImage[];
  variants: ProductVariant[];
  productName: string;
  productSlug: string;
  initialVariantId: string | null;
  detailsBeforeVariant: ReactNode;
  detailsAfterVariant: ReactNode;
}

export function ProductDetailInteractive({
  images,
  variants,
  productName,
  productSlug,
  initialVariantId,
  detailsBeforeVariant,
  detailsAfterVariant,
}: ProductDetailInteractiveProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    initialVariantId,
  );
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  function handleVariantChange(variantId: string) {
    setSelectedVariantId(variantId);
    setActiveGalleryIndex(0);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-(--spacing-gutter-desktop)">
      <ProductGallery
        images={images}
        productName={productName}
        selectedVariantId={selectedVariantId}
        activeIndex={activeGalleryIndex}
        onActiveIndexChange={setActiveGalleryIndex}
      />

      <div className="space-y-6">
        {detailsBeforeVariant && <div key="before-variant">{detailsBeforeVariant}</div>}
        {variants.length > 0 ? (
          <div key="variant-selector">
            <VariantSelector
              variants={variants}
              productName={productName}
              productSlug={productSlug}
              selectedVariantId={selectedVariantId}
              onVariantChange={handleVariantChange}
            />
          </div>
        ) : (
          <p key="no-variants" className="text-on-surface-variant text-body-sm">
            No variants available.
          </p>
        )}
        {detailsAfterVariant && <div key="after-variant">{detailsAfterVariant}</div>}
      </div>
    </div>
  );
}
