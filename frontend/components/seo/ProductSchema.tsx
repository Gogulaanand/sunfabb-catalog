import type { Product } from "@/lib/api";
import { safeJsonLd } from "@/lib/json-ld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sunfabb.com";

interface ProductSchemaProps {
  product: Product;
  siteUrl?: string;
}

export function buildProductSchemaData(product: Product, siteUrl: string) {
  const primaryImage =
    product.images.find(
      (img) => img.is_primary && img.image_role === "GALLERY",
    ) ?? product.images.find((img) => img.image_role === "GALLERY");

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.description && { description: product.description }),
    brand: { "@type": "Brand", name: "Sunfabb" },
    ...(primaryImage && { image: primaryImage.url }),
    offers: product.variants.map((v) => ({
      "@type": "Offer",
      price: (v.price / 100).toFixed(2),
      priceCurrency: "INR",
      availability:
        v.stock_quantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "Sunfabb" },
      url: `${siteUrl}/catalog/${product.slug}`,
    })),
  };
}

export function ProductSchema({
  product,
  siteUrl = SITE_URL,
}: ProductSchemaProps) {
  const data = buildProductSchemaData(product, siteUrl);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}
