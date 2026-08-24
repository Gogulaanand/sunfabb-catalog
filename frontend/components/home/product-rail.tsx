import { ProductCard } from "@/components/product/product-card";
import { StaggerGroup, StaggerItem } from "@/components/motion";
import { TrackedContentLink } from "@/components/analytics/tracked-content-link";
import type { AnalyticsItem } from "@/lib/analytics";
import { formatPrice, type ProductListItem } from "@/lib/api";

interface ProductRailProps {
  products: ProductListItem[];
  analyticsItems: AnalyticsItem[];
  /** Distinguishes a failed catalogue request from a valid empty response. */
  isUnavailable?: boolean;
}

function primaryGalleryImage(product: ProductListItem) {
  const gallery = product.images.filter((image) => image.image_role === "GALLERY");
  return gallery.find((image) => image.is_primary) ?? gallery[0];
}

function lowestPrice(product: ProductListItem): number | null {
  return product.variants.length
    ? Math.min(...product.variants.map((variant) => variant.price))
    : null;
}

export function ProductRail({
  products,
  analyticsItems,
  isUnavailable = false,
}: ProductRailProps) {
  if (products.length === 0) {
    return (
      <div
        className="rounded-lg border border-home-stone bg-white/55 px-5 py-8 text-base leading-7 text-home-graphite/75"
        role="status"
      >
        {isUnavailable ? (
          <p>
            Designs are temporarily unavailable. Please try again shortly.
          </p>
        ) : (
          <p>
            No current designs are available in this rail yet.{' '}
            <TrackedContentLink
              href="/catalog"
              contentType="homepage_cta"
              contentId="featured_browse_categories"
              linkLocation="featured_designs"
              className="font-semibold text-home-clay underline decoration-home-clay/40 underline-offset-4 hover:decoration-home-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-clay focus-visible:ring-offset-2"
            >
              Browse the catalogue
            </TrackedContentLink>
            {" "}to check the latest categories.
          </p>
        )}
      </div>
    );
  }

  return (
    <StaggerGroup className="home-product-rail">
      {products.map((product, index) => {
        const image = primaryGalleryImage(product);
        const price = lowestPrice(product);

        return (
          <StaggerItem key={product.id}>
            <ProductCard
              slug={product.slug}
              name={product.name}
              imageUrl={image?.url}
              imageAlt={image?.alt_text ?? product.name}
              formattedPrice={price !== null ? formatPrice(price) : null}
              aspectRatio="3/4"
              sizes="(max-width: 767px) 74vw, (max-width: 1023px) 36vw, 20rem"
              priority={index < 2}
              analytics={{
                item: analyticsItems[index],
                listName: "Homepage designs",
                listId: "homepage-designs",
              }}
            />
          </StaggerItem>
        );
      })}
    </StaggerGroup>
  );
}
