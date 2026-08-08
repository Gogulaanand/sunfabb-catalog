import { SITE, SITE_URL, type SocialProfile } from '@/lib/site-config';
import { safeJsonLd } from '@/lib/json-ld';

export interface OrganizationGraphData {
  '@context': 'https://schema.org';
  '@graph': Array<Record<string, unknown>>;
}

export function buildOrganizationSchemas(
  siteUrl: string,
  socialProfiles: readonly SocialProfile[] = SITE.socialProfiles,
): OrganizationGraphData {
  const organization: Record<string, unknown> = {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: SITE.name,
    url: siteUrl,
    description:
      'Home textiles from India - bedspreads, towels, napkins and table linen.',
  };

  // sameAs is an identity assertion, so omit it entirely until the owner has
  // supplied real, active profiles through the verified site configuration.
  if (socialProfiles.length > 0) {
    organization.sameAs = socialProfiles.map((profile) => profile.url);
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: SITE.name,
        publisher: { '@id': `${siteUrl}/#organization` },
      },
    ],
  };
}

export function OrganizationSchema() {
  const data = buildOrganizationSchemas(SITE_URL);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}
