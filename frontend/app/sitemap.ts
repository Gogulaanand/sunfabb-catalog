import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/api";
import { getAllGuides } from "@/lib/guides";

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

  const guideUrls: MetadataRoute.Sitemap = getAllGuides().map((guide) => ({
    url: `${siteUrl}/guides/${guide.slug}`,
    lastModified: guide.date,
    changeFrequency: "yearly",
    priority: 0.6,
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
    {
      url: `${siteUrl}/guides`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...guideUrls,
    {
      url: `${siteUrl}/faq`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/contact`,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];
}
