import type { ProductImage, ProductVariant } from "@/lib/api";

export function sortGalleryImages(images: ProductImage[]): ProductImage[] {
  return [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.sort_order - b.sort_order || a.id.localeCompare(b.id);
  });
}

export function getApplicableGalleryImages(
  images: ProductImage[],
  selectedVariantId: string | null,
): ProductImage[] {
  return sortGalleryImages(
    images.filter(
      (image) =>
        image.image_role === "GALLERY" &&
        (image.variant_id === null || image.variant_id === selectedVariantId),
    ),
  );
}

export function getInitialVariantId(
  variants: ProductVariant[],
  images: ProductImage[],
): string | null {
  const activeVariantIds = new Set(variants.map((variant) => variant.id));
  const primaryGalleryImage = sortGalleryImages(
    images.filter((image) => image.image_role === "GALLERY"),
  ).find((image) => image.is_primary);

  if (
    primaryGalleryImage?.variant_id &&
    activeVariantIds.has(primaryGalleryImage.variant_id)
  ) {
    return primaryGalleryImage.variant_id;
  }

  return variants[0]?.id ?? null;
}
