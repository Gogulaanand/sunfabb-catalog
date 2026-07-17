// Single source of truth for brand contact data.
// PLACEHOLDER values below — owner must supply real phone, WhatsApp number,
// address, Maps URL, Instagram handle, and business hours before launch.
// JSON-LD on /contact is suppressed while any field is a placeholder.

export const SITE = {
  name: 'Sunfabb',
  phone: {
    display: '+91 XXXXX XXXXX', // PLACEHOLDER
    e164: '+91XXXXXXXXXX',      // PLACEHOLDER — E.164 format, no spaces
  },
  whatsapp: {
    // Digits only, country code, no '+' — wa.me format requires this.
    number: '91XXXXXXXXXX',     // PLACEHOLDER
    defaultMessage: "Hi Sunfabb, I'd like to know more about your products.",
  },
  email: 'hello@sunfabb.com',   // PLACEHOLDER
  address: {
    lines: ['...'],             // PLACEHOLDER — street, city, pincode
    mapsUrl: 'https://maps.app.goo.gl/...', // PLACEHOLDER
  },
  instagramUrl: 'https://instagram.com/sunfabb', // PLACEHOLDER
  hours: 'Mon-Sat, 9:30 AM - 6:30 PM IST',
} as const;

export function whatsappLink(message: string = SITE.whatsapp.defaultMessage): string {
  return `https://wa.me/${SITE.whatsapp.number}?text=${encodeURIComponent(message)}`;
}

export const telLink = `tel:${SITE.phone.e164}`;

export const mailtoLink = `mailto:${SITE.email}`;
