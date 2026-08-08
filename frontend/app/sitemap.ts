import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/api";
import { getAllGuides } from "@/lib/guides";
import { SITE_URL, TRUST_PAGE_LINKS } from "@/lib/site-config";

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
      url: `${SITE_URL}/catalog/${product.slug}`,
      lastModified: product.updated_at,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );

  const categoryUrls: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${SITE_URL}/catalog?category=${category.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const guideUrls: MetadataRoute.Sitemap = getAllGuides().map((guide) => ({
    url: `${SITE_URL}/guides/${guide.slug}`,
    lastModified: guide.date,
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  const trustUrls: MetadataRoute.Sitemap = TRUST_PAGE_LINKS.map(({ href }) => ({
    url: `${SITE_URL}${href}`,
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  return [
    {
      url: SITE_URL,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/catalog`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...categoryUrls,
    ...productUrls,
    {
      url: `${SITE_URL}/guides`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...guideUrls,
    {
      url: `${SITE_URL}/faq`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/contact`,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    ...trustUrls,
  ];
}
