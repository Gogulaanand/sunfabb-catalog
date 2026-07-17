import { safeJsonLd } from "@/lib/json-ld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sunfabb.com";

interface ItemListSchemaProps {
  items: Array<{ name: string; slug: string }>;
  siteUrl?: string;
}

export function buildItemListSchemaData(
  items: Array<{ name: string; slug: string }>,
  siteUrl: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: `${siteUrl}/catalog/${item.slug}`,
    })),
  };
}

export function ItemListSchema({
  items,
  siteUrl = SITE_URL,
}: ItemListSchemaProps) {
  const data = buildItemListSchemaData(items, siteUrl);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}
