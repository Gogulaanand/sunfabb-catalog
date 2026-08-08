// Public site configuration. Values that require owner verification come from
// explicit environment inputs; there are no guessed or placeholder defaults.

function optionalValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function optionalList(
  value: string | undefined,
): readonly string[] | undefined {
  const values = value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return values && values.length > 0 ? values : undefined;
}

export const SITE_URL =
  optionalValue(process.env.NEXT_PUBLIC_SITE_URL) ?? 'https://sunfabb.com';

export const TRUST_PAGE_LINKS = [
  { href: '/about', label: 'About Sunfabb' },
  { href: '/shipping-policy', label: 'Shipping' },
  { href: '/returns-policy', label: 'Returns' },
  { href: '/privacy-policy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
] as const;

export interface SocialProfile {
  provider: 'Instagram' | 'Facebook' | 'Pinterest' | 'YouTube';
  url: string;
}

const instagramUrl = optionalValue(process.env.NEXT_PUBLIC_INSTAGRAM_URL);
const facebookUrl = optionalValue(process.env.NEXT_PUBLIC_FACEBOOK_URL);
const pinterestUrl = optionalValue(process.env.NEXT_PUBLIC_PINTEREST_URL);
const youtubeUrl = optionalValue(process.env.NEXT_PUBLIC_YOUTUBE_URL);

const socialProfiles: readonly SocialProfile[] = [
  instagramUrl ? { provider: 'Instagram', url: instagramUrl } : undefined,
  facebookUrl ? { provider: 'Facebook', url: facebookUrl } : undefined,
  pinterestUrl ? { provider: 'Pinterest', url: pinterestUrl } : undefined,
  youtubeUrl ? { provider: 'YouTube', url: youtubeUrl } : undefined,
].filter((profile): profile is SocialProfile => profile !== undefined);

const configuredAddressLines = optionalList(
  process.env.NEXT_PUBLIC_ADDRESS_LINES,
);

// Owner-approved public contact details for Sunfabb. These are intentionally
// public storefront facts; secrets and billing-only identifiers do not belong
// in this module or in any NEXT_PUBLIC_* variable.
const approvedPublicContact = {
  phoneDisplay: '+91 70107 35152',
  phoneE164: '+917010735152',
  whatsappNumber: '917010735152',
  email: 'sunfabb@gmail.com',
  addressLines: [
    '31',
    'Gandhiji street',
    'Ingur road',
    'Chennimalai',
    'Erode - 638051',
  ],
  mapsUrl: 'https://maps.app.goo.gl/4Tj5dc8vD6t2WzBw6',
  hours: 'Mon to Sat - 9:00 am to 6:00 pm',
} as const;

// Working storefront copy approved for this lead-generation release. These
// values are deliberately conservative and remain easy to override while the
// owner finalises operational and legal wording.
const approvedWorkingTrust = {
  dispatchExpectation:
    'Dispatch timing is confirmed before an order is accepted; ask us for an estimate.',
  deliveryRegion: 'Delivery is available to serviceable Indian PIN codes.',
  returnsSummary:
    'Working returns policy: request a return within 7 calendar days after delivery; conditions apply.',
} as const;

export const SITE = {
  name: 'Sunfabb',
  url: SITE_URL,
  region: 'India',
  currency: 'INR',
  phone: {
    display:
      optionalValue(process.env.NEXT_PUBLIC_CONTACT_PHONE_DISPLAY) ??
      approvedPublicContact.phoneDisplay,
    e164:
      optionalValue(process.env.NEXT_PUBLIC_CONTACT_PHONE_E164) ??
      approvedPublicContact.phoneE164,
  },
  whatsapp: {
    // Digits only, country code, no '+' — wa.me format requires this.
    number:
      optionalValue(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER) ??
      approvedPublicContact.whatsappNumber,
    defaultMessage: "Hi Sunfabb, I'd like to know more about your products.",
  },
  email:
    optionalValue(process.env.NEXT_PUBLIC_CONTACT_EMAIL) ??
    approvedPublicContact.email,
  address: {
    lines: configuredAddressLines ?? approvedPublicContact.addressLines,
    mapsUrl:
      optionalValue(process.env.NEXT_PUBLIC_MAPS_URL) ??
      approvedPublicContact.mapsUrl,
  },
  hours:
    optionalValue(process.env.NEXT_PUBLIC_BUSINESS_HOURS) ??
    approvedPublicContact.hours,
  // The legal identity remains undefined. Operational PDP copy below is a
  // conservative working draft and can be overridden by the owner.
  trust: {
    legalEntityName: optionalValue(process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME),
    registeredAddress: optionalValue(
      process.env.NEXT_PUBLIC_REGISTERED_ADDRESS,
    ),
    returnWindow:
      optionalValue(process.env.NEXT_PUBLIC_RETURN_WINDOW) ??
      approvedWorkingTrust.returnsSummary,
    shippingCoverage:
      optionalValue(process.env.NEXT_PUBLIC_SHIPPING_COVERAGE) ??
      approvedWorkingTrust.deliveryRegion,
    shippingTimeline:
      optionalValue(process.env.NEXT_PUBLIC_SHIPPING_TIMELINE) ??
      approvedWorkingTrust.dispatchExpectation,
  },
  // Only owner-configured profiles belong here. The empty default is
  // deliberate: an absent profile must not become a structured-data claim.
  socialProfiles,
  // Kept as named fields for existing consumers and future provider-specific
  // UI. They have no checked-in profile defaults.
  instagramUrl,
  facebookUrl,
  pinterestUrl,
  youtubeUrl,
} as const;

function isValidWhatsAppNumber(number: string): boolean {
  return /^\d{10,15}$/.test(number);
}

export function whatsappLink(
  message: string = SITE.whatsapp.defaultMessage,
): string | undefined {
  if (!isValidWhatsAppNumber(SITE.whatsapp.number)) return undefined;

  return `https://wa.me/${SITE.whatsapp.number}?text=${encodeURIComponent(message)}`;
}

// Kept as small compatibility helpers for the existing enquiry CTA. They are
// fail-closed: no WhatsApp CTA is rendered until the owner configures a valid
// international number.
export function isWhatsAppConfigured(): boolean {
  return Boolean(whatsappLink());
}

export function buildProductEnquiryMessage(
  productName: string,
  variantLabel: string,
): string {
  return `Hi Sunfabb, I'd like to enquire about ${productName}${
    variantLabel ? ` (${variantLabel})` : ''
  }.`;
}

export const telLink = SITE.phone.e164 ? `tel:${SITE.phone.e164}` : undefined;

export const mailtoLink = SITE.email ? `mailto:${SITE.email}` : undefined;
