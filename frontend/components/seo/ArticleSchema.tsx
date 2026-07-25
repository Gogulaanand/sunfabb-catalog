import { safeJsonLd } from "@/lib/json-ld";

interface ArticleSchemaProps {
  headline: string;
  description: string;
  /** ISO date, YYYY-MM-DD. */
  datePublished: string;
  url: string;
}

export function buildArticleSchemaData({
  headline,
  description,
  datePublished,
  url,
}: ArticleSchemaProps) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    datePublished,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    author: {
      "@type": "Organization",
      name: "Sunfabb",
    },
    publisher: {
      "@type": "Organization",
      name: "Sunfabb",
    },
  };
}

export function ArticleSchema(props: ArticleSchemaProps) {
  const data = buildArticleSchemaData(props);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}
