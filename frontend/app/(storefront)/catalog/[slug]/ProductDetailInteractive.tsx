"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { ProductImage, ProductVariant } from "@/lib/api";
import { trackViewItem } from "@/lib/analytics";
import { ProductGallery } from "./ProductGallery";
import { VariantSelector } from "./VariantSelector";

interface ProductDetailInteractiveProps {
  images: ProductImage[];
  variants: ProductVariant[];
  productName: string;
  productSlug: string;
  categoryName?: string;
  initialVariantId: string | null;
  detailsBeforeVariant: ReactNode;
  detailsAfterVariant: ReactNode;
}

export function ProductDetailInteractive({
  images,
  variants,
  productName,
  productSlug,
  categoryName,
  initialVariantId,
  detailsBeforeVariant,
  detailsAfterVariant,
}: ProductDetailInteractiveProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    initialVariantId,
  );
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const viewTracked = useRef(false);

  // GA4 `view_item` fires once per mount, not per variant switch: switching
  // size or colour is still one product view, and re-firing would inflate the
  // top of the funnel against every other step.
  useEffect(() => {
    if (viewTracked.current) return;
    const variant =
      variants.find((v) => v.id === initialVariantId) ?? variants[0];
    if (!variant) return;
    viewTracked.current = true;

    trackViewItem({
      item_id: variant.id,
      item_name: productName,
      price_paise: variant.price,
      item_category: categoryName,
      item_variant: [variant.size, variant.color.name, variant.material.name]
        .filter(Boolean)
        .join(" · "),
    });
  }, [variants, initialVariantId, productName, categoryName]);

  function handleVariantChange(variantId: string) {
    setSelectedVariantId(variantId);
    setActiveGalleryIndex(0);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-(--spacing-gutter-desktop) items-start">
      <ProductGallery
        images={images}
        productName={productName}
        selectedVariantId={selectedVariantId}
        activeIndex={activeGalleryIndex}
        onActiveIndexChange={setActiveGalleryIndex}
      />

      <div className="lg:sticky lg:top-20 lg:self-start space-y-6">
        {detailsBeforeVariant && <div key="before-variant">{detailsBeforeVariant}</div>}
        {variants.length > 0 ? (
          <div key="variant-selector">
            <VariantSelector
              variants={variants}
              productName={productName}
              productSlug={productSlug}
              categoryName={categoryName}
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
