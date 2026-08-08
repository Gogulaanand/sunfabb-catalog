import { describe, it, expect } from 'vitest';
import {
  mailtoLink,
  SITE,
  SITE_URL,
  SOCIAL_PREVIEW_IMAGE,
  telLink,
  TRUST_PAGE_LINKS,
  isTestImageUrl,
  shouldRenderStorefrontImage,
  whatsappLink,
} from './site-config';

describe('site configuration', () => {
  it('contains only verified, non-placeholder brand context', () => {
    expect(SITE.name).toBe('Sunfabb');
    expect(SITE.region).toBe('India');
    expect(SITE.currency).toBe('INR');
    expect(SITE.phone.display).toBe('+91 70107 35152');
    expect(SITE.email).toBe('sunfabb@gmail.com');
    expect(SITE.address.mapsUrl).toBe(
      'https://maps.app.goo.gl/4Tj5dc8vD6t2WzBw6',
    );
    expect(SITE_URL).toMatch(/^https?:\/\//);
    expect(SOCIAL_PREVIEW_IMAGE).toEqual({
      url: '/images/home/sunfabb-hero-option-e.png',
      width: 1672,
      height: 941,
      alt: 'Sunfabb home textiles in a sunlit home',
    });
    expect(JSON.stringify(SITE)).not.toMatch(
      /XXXXX|maps\.app\.goo\.gl\/\.\.\.|instagram\.com\/sunfabb|gstin/i,
    );
  });

  it('centralizes the five trust-page links', () => {
    expect(TRUST_PAGE_LINKS.map((link) => link.href)).toEqual([
      '/about',
      '/shipping-policy',
      '/returns-policy',
      '/privacy-policy',
      '/terms',
    ]);
  });

  it('does not expose social profiles unless they are configured', () => {
    expect(SITE.socialProfiles.every((profile) => profile.url.length > 0)).toBe(
      true,
    );
  });
});

describe('whatsappLink', () => {
  it('returns no link when the WhatsApp number is unavailable', () => {
    if (!SITE.whatsapp.number) {
      expect(whatsappLink()).toBeUndefined();
    }
  });

  it('URL-encodes a configured default message', () => {
    const link = whatsappLink();
    if (link) {
      expect(link).toContain('%20');
      expect(link).not.toContain(' ');
      expect(link).toContain(SITE.whatsapp.number);
    }
  });

  it('URL-encodes a custom message when WhatsApp is configured', () => {
    const link = whatsappLink('Hello? I need 50 towels & napkins!');
    if (link) {
      expect(link).not.toContain(' ');
      expect(link).toContain('text=');
      expect(link).toContain(
        encodeURIComponent('Hello? I need 50 towels & napkins!'),
      );
    }
  });

  it('accepts an emoji in the custom message without throwing', () => {
    expect(() => whatsappLink('Hi 👋 Sunfabb')).not.toThrow();
  });
});

describe('contact links', () => {
  it('returns a tel link only when a phone number is configured', () => {
    expect(telLink).toBe(
      SITE.phone.e164 ? 'tel:' + SITE.phone.e164 : undefined,
    );
  });

  it('returns a mailto link only when an email is configured', () => {
    expect(mailtoLink).toBe(SITE.email ? 'mailto:' + SITE.email : undefined);
  });
});

describe('storefront image visibility', () => {
  it('recognises the seeded Unsplash host as test imagery', () => {
    expect(
      isTestImageUrl(
        'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80',
      ),
    ).toBe(true);
    expect(isTestImageUrl('https://res.cloudinary.com/demo/image/upload/sample.jpg')).toBe(false);
  });

  it('hides test imagery only when the storefront switch is enabled', () => {
    const testImage = 'https://images.unsplash.com/photo-test';
    const ownedImage = 'https://res.cloudinary.com/demo/image/upload/owned.jpg';

    expect(shouldRenderStorefrontImage(testImage, true)).toBe(false);
    expect(shouldRenderStorefrontImage(testImage, false)).toBe(true);
    expect(shouldRenderStorefrontImage(ownedImage, true)).toBe(true);
  });
});
