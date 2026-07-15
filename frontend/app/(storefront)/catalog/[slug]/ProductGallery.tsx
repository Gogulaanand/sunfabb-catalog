"use client";

import Image from "next/image";
import { useRef } from "react";
import type { ProductImage } from "@/lib/api";
import { getApplicableGalleryImages } from "./product-gallery-utils";

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
  selectedVariantId: string | null;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
}

export function ProductGallery({
  images,
  productName,
  selectedVariantId,
  activeIndex,
  onActiveIndexChange,
}: ProductGalleryProps) {
  const galleryImages = getApplicableGalleryImages(images, selectedVariantId);
  const touchStartX = useRef<number | null>(null);
  const visibleIndex = galleryImages.length > 0
    ? Math.min(activeIndex, galleryImages.length - 1)
    : 0;
  const activeImage = galleryImages[visibleIndex];

  function moveBy(offset: number) {
    if (galleryImages.length < 2) return;
    onActiveIndexChange(
      (visibleIndex + offset + galleryImages.length) % galleryImages.length,
    );
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveBy(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveBy(1);
    }
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const startX = touchStartX.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (startX === null || endX === undefined) return;

    const distance = endX - startX;
    if (Math.abs(distance) < 40) return;
    moveBy(distance < 0 ? 1 : -1);
  }

  return (
    <div
      className="space-y-3"
      role="region"
      aria-roledescription="carousel"
      aria-label={`${productName} product images`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {activeImage ? (
        <div className="relative aspect-square rounded-md overflow-hidden bg-surface-container">
          <Image
            src={activeImage.url}
            alt={activeImage.alt_text ?? productName}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            data-testid="product-gallery-main-image"
          />
          {galleryImages.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => moveBy(-1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-surface/90 px-3 py-2 text-on-surface shadow-sm transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span aria-hidden="true">←</span>
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={() => moveBy(1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-surface/90 px-3 py-2 text-on-surface shadow-sm transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span aria-hidden="true">→</span>
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="aspect-square rounded-md bg-surface-container flex items-center justify-center text-outline text-7xl">
          🧵
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {activeImage
          ? `Image ${visibleIndex + 1} of ${galleryImages.length}`
          : "No product images available"}
      </p>

      {galleryImages.length > 0 && (
        <div
          className="flex gap-3 overflow-x-auto pb-1"
          role="tablist"
          aria-label={`${productName} image thumbnails`}
        >
          {galleryImages.map((image, index) => {
            const isSelected = index === visibleIndex;
            return (
              <button
                key={image.id}
                type="button"
                role="tab"
                aria-label={`View image ${index + 1}`}
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onActiveIndexChange(index)}
                className={`relative w-20 h-20 shrink-0 rounded overflow-hidden bg-surface-container border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isSelected
                    ? "border-primary"
                    : "border-outline-variant hover:border-primary"
                }`}
              >
                <Image
                  src={image.url}
                  alt={image.alt_text ?? productName}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
