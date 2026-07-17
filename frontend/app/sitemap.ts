import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/api";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sunfabb.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, productsData] = await Promise.all([
    getCategories().catch(() => []),
    getProducts({ limit: 100 }).catch(() => ({
      items: [],
      total: 0,
      page: 1,
      limit: 100,
    })),
  ]);

  const productUrls: MetadataRoute.Sitemap = productsData.items.map(
    (product) => ({
      url: `${siteUrl}/catalog/${product.slug}`,
      lastModified: product.updated_at,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );

  const categoryUrls: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${siteUrl}/catalog?category=${category.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    {
      url: siteUrl,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/catalog`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...categoryUrls,
    ...productUrls,
  ];
}
