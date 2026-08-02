// Public site configuration. Values that require owner verification come from
// explicit environment inputs; there are no guessed or placeholder defaults.

function optionalValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function optionalList(value: string | undefined): readonly string[] | undefined {
  const values = value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return values && values.length > 0 ? values : undefined;
}

export const SITE_URL =
  optionalValue(process.env.NEXT_PUBLIC_SITE_URL) ?? "https://sunfabb.com";

export const TRUST_PAGE_LINKS = [
  { href: "/about", label: "About Sunfabb" },
  { href: "/shipping-policy", label: "Shipping" },
  { href: "/returns-policy", label: "Returns" },
  { href: "/privacy-policy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export interface SocialProfile {
  provider: "Instagram" | "Facebook" | "Pinterest" | "YouTube";
  url: string;
}

const instagramUrl = optionalValue(process.env.NEXT_PUBLIC_INSTAGRAM_URL);
const facebookUrl = optionalValue(process.env.NEXT_PUBLIC_FACEBOOK_URL);
const pinterestUrl = optionalValue(process.env.NEXT_PUBLIC_PINTEREST_URL);
const youtubeUrl = optionalValue(process.env.NEXT_PUBLIC_YOUTUBE_URL);

const socialProfiles: readonly SocialProfile[] = [
  instagramUrl ? { provider: "Instagram", url: instagramUrl } : undefined,
  facebookUrl ? { provider: "Facebook", url: facebookUrl } : undefined,
  pinterestUrl ? { provider: "Pinterest", url: pinterestUrl } : undefined,
  youtubeUrl ? { provider: "YouTube", url: youtubeUrl } : undefined,
].filter((profile): profile is SocialProfile => profile !== undefined);

const configuredAddressLines = optionalList(
  process.env.NEXT_PUBLIC_ADDRESS_LINES,
);

export const SITE = {
  name: "Sunfabb",
  url: SITE_URL,
  region: "India",
  currency: "INR",
  phone: {
    // These empty strings preserve the existing contact-page shape until that
    // route is migrated to the optional config boundary. New UI must gate on
    // availability and never render them as values.
    display: optionalValue(process.env.NEXT_PUBLIC_CONTACT_PHONE_DISPLAY) ?? "",
    e164: optionalValue(process.env.NEXT_PUBLIC_CONTACT_PHONE_E164) ?? "",
  },
  whatsapp: {
    // Digits only, country code, no '+' — wa.me format requires this.
    number: optionalValue(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER) ?? "",
    defaultMessage: "Hi Sunfabb, I'd like to know more about your products.",
  },
  email: optionalValue(process.env.NEXT_PUBLIC_CONTACT_EMAIL) ?? "",
  address: {
    // Keep an empty list for compatibility with the existing contact route;
    // the absence of an address is represented by no lines and no map URL.
    lines: configuredAddressLines ?? [],
    mapsUrl: optionalValue(process.env.NEXT_PUBLIC_MAPS_URL) ?? "",
  },
  hours: optionalValue(process.env.NEXT_PUBLIC_BUSINESS_HOURS),
  // These fields stay undefined until the owner or a legal reviewer supplies
  // the corresponding facts. They are intentionally not used to draft policy.
  trust: {
    legalEntityName: optionalValue(process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME),
    registeredAddress: optionalValue(process.env.NEXT_PUBLIC_REGISTERED_ADDRESS),
    gstin: optionalValue(process.env.NEXT_PUBLIC_GSTIN),
    returnWindow: optionalValue(process.env.NEXT_PUBLIC_RETURN_WINDOW),
    shippingCoverage: optionalValue(process.env.NEXT_PUBLIC_SHIPPING_COVERAGE),
    shippingTimeline: optionalValue(process.env.NEXT_PUBLIC_SHIPPING_TIMELINE),
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
    variantLabel ? ` (${variantLabel})` : ""
  }.`;
}

export const telLink = SITE.phone.e164
  ? `tel:${SITE.phone.e164}`
  : undefined;

export const mailtoLink = SITE.email ? `mailto:${SITE.email}` : undefined;
