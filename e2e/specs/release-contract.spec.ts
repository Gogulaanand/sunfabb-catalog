import { expect, test } from '@playwright/test';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sunfabb.com';

const STATIC_PUBLIC_PATHS = [
  '/',
  '/catalog',
  '/guides',
  '/faq',
  '/contact',
  '/about',
  '/shipping-policy',
  '/returns-policy',
  '/privacy-policy',
  '/terms',
];

function normalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = '';
  if (url.pathname === '/') url.pathname = '/';
  return url.toString();
}

function pathFromSiteUrl(value: string): string {
  const url = new URL(value);
  return `${url.pathname}${url.search}`;
}

function sitemapLocations(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function metaContent(html: string, attribute: string, value: string): string {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(
    new RegExp(
      `<meta[^>]+${attribute}=["']${escapedValue}["'][^>]+content=["']([^"']+)["']`,
      'i',
    ),
  );
  return match?.[1] ?? '';
}

function canonicalHref(html: string): string {
  const match = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
  );
  return match?.[1] ?? '';
}

function collectStructuredDataTypes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectStructuredDataTypes);
  }
  if (typeof value !== 'object' || value === null) return [];

  const entries = Object.entries(value);
  const ownTypeValue = entries.find(([key]) => key === '@type')?.[1];
  const ownType = typeof ownTypeValue === 'string' ? [ownTypeValue] : [];
  return [
    ...ownType,
    ...entries.flatMap(([, entry]) => collectStructuredDataTypes(entry)),
  ];
}

function structuredDataTypes(html: string): string[] {
  return [
    ...html.matchAll(
      /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ]
    .flatMap((match) => {
      try {
        return collectStructuredDataTypes(JSON.parse(match[1]));
      } catch {
        return [];
      }
    });
}

test.describe('Phase 5 public release contract', () => {
  test('crawls sitemap-listed public routes and validates their HTML contract', async ({
    request,
  }) => {
    const sitemapResponse = await request.get('/sitemap.xml');
    expect(sitemapResponse.status()).toBe(200);
    expect(sitemapResponse.headers()['content-type']).toContain('xml');

    const sitemapUrls = sitemapLocations(await sitemapResponse.text());
    expect(sitemapUrls.length).toBeGreaterThan(0);
    expect(new Set(sitemapUrls).size).toBe(sitemapUrls.length);

    const expectedSiteUrls = STATIC_PUBLIC_PATHS.map(
      (path) => new URL(path, SITE_URL).toString(),
    );
    for (const expectedSiteUrl of expectedSiteUrls) {
      expect(
        sitemapUrls.map(normalizeUrl),
        `missing ${expectedSiteUrl} from sitemap`,
      ).toContain(normalizeUrl(expectedSiteUrl));
    }

    const publicPaths = [
      ...STATIC_PUBLIC_PATHS,
      ...sitemapUrls.map(pathFromSiteUrl),
    ].filter((path, index, paths) => paths.indexOf(path) === index);

    for (const path of publicPaths) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      const html = await response.text();
      const canonical = canonicalHref(html);
      expect(canonical, `${path} is missing a canonical URL`).not.toBe('');
      expect(normalizeUrl(canonical), `${path} canonical`).toBe(
        normalizeUrl(new URL(path, SITE_URL).toString()),
      );
      expect(
        metaContent(html, 'property', 'og:title'),
        `${path} og:title`,
      ).not.toBe('');
      expect(
        metaContent(html, 'property', 'og:description'),
        `${path} og:description`,
      ).not.toBe('');
      expect(
        metaContent(html, 'property', 'og:image'),
        `${path} og:image`,
      ).not.toBe('');
      expect(structuredDataTypes(html), `${path} structured data`).not.toEqual(
        [],
      );

      const route = new URL(path, SITE_URL).pathname;
      if (route.startsWith('/catalog/')) {
        expect(structuredDataTypes(html), `${path} Product JSON-LD`).toContain(
          'Product',
        );
      }
      if (route === '/catalog') {
        expect(
          structuredDataTypes(html),
          `${path} Breadcrumb JSON-LD`,
        ).toContain('BreadcrumbList');
      }
    }
  });

  test('publishes robots directives for the sitemap and private routes', async ({
    request,
  }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const robots = await response.text();

    expect(robots).toContain('User-Agent: *');
    expect(robots).toContain('Allow: /');
    for (const path of ['/admin', '/account', '/cart', '/checkout', '/api']) {
      expect(robots).toContain(`Disallow: ${path}`);
    }
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });
});
