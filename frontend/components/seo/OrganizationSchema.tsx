const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sunfabb.com";

export interface OrganizationGraphData {
  "@context": "https://schema.org";
  "@graph": Array<Record<string, unknown>>;
}

export function buildOrganizationSchemas(siteUrl: string): OrganizationGraphData {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Sunfabb",
        url: siteUrl,
        description:
          "Premium handcrafted home textiles from India - bedspreads, towels, napkins and table linen.",
        sameAs: [],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "Sunfabb",
        publisher: { "@id": `${siteUrl}/#organization` },
      },
    ],
  };
}

export function OrganizationSchema() {
  const data = buildOrganizationSchemas(SITE_URL);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
