import type { Metadata } from "next";
import Link from "next/link";
import { SITE, whatsappLink, telLink, mailtoLink } from "@/lib/site-config";
import ContactForm from "@/components/storefront/contact-form";

export const metadata: Metadata = {
  title: "Contact Us | Sunfabb",
  description:
    "Get in touch with Sunfabb for enquiries about our premium bedspreads, towels, napkins, and table linen. Call, WhatsApp, or send us a message.",
};

// LocalBusiness JSON-LD helps Google surface the business in Maps and local search.
// Intentionally omitted when fields are still placeholders — fake structured data
// is worse than none (it can trigger Google penalties).
const isPlaceholder =
  SITE.phone.e164.includes("X") ||
  SITE.address.mapsUrl.includes("...") ||
  SITE.instagramUrl.includes("sunfabb") === false;

const jsonLd = isPlaceholder
  ? null
  : {
      "@context": "https://schema.org",
      "@type": "HomeGoodsStore",
      name: SITE.name,
      telephone: SITE.phone.e164,
      email: SITE.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: SITE.address.lines[0],
        addressCountry: "IN",
      },
      openingHours: SITE.hours,
      sameAs: [SITE.instagramUrl],
      url: "https://sunfabb.com",
    };

export default function ContactPage() {
  return (
    <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8 text-body-sm text-on-surface-variant">
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-on-surface">Contact Us</span>
      </nav>

      <h1 className="font-display text-3xl md:text-4xl text-on-surface mb-4">
        Contact Us
      </h1>
      <p className="text-body-sm text-on-surface-variant mb-10 max-w-xl">
        We&apos;d love to hear from you — whether it&apos;s a bulk order enquiry, a custom
        design, or just a question about our products.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left column — contact channels */}
        <div className="space-y-8">
          <div>
            <p className="text-label-caps text-on-surface-variant mb-4">
              Reach us directly
            </p>
            <ul className="space-y-4">
              <li>
                <a
                  href={telLink}
                  className="flex items-start gap-3 group"
                  aria-label={`Call us at ${SITE.phone.display}`}
                >
                  <span className="mt-0.5 text-primary">
                    {/* Phone icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 11a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 .18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 7.91a16 16 0 0 0 6 6l1.09-1.09a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 14h1a2 2 0 0 1 .98 2.92z" />
                    </svg>
                  </span>
                  <span>
                    <span className="block text-body-sm text-on-surface group-hover:text-primary transition-colors">
                      {SITE.phone.display}
                    </span>
                    <span className="text-body-sm text-outline">Call us</span>
                  </span>
                </a>
              </li>

              <li>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 group"
                  aria-label="Chat with us on WhatsApp"
                >
                  <span className="mt-0.5 text-primary">
                    {/* WhatsApp icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                  </span>
                  <span>
                    <span className="block text-body-sm text-on-surface group-hover:text-primary transition-colors">
                      WhatsApp us
                    </span>
                    <span className="text-body-sm text-outline">
                      Opens a pre-filled chat
                    </span>
                  </span>
                </a>
              </li>

              <li>
                <a
                  href={mailtoLink}
                  className="flex items-start gap-3 group"
                >
                  <span className="mt-0.5 text-primary">
                    {/* Email icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <polyline points="22,4 12,13 2,4" />
                    </svg>
                  </span>
                  <span>
                    <span className="block text-body-sm text-on-surface group-hover:text-primary transition-colors">
                      {SITE.email}
                    </span>
                    <span className="text-body-sm text-outline">Email us</span>
                  </span>
                </a>
              </li>

              <li>
                <a
                  href={SITE.address.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 group"
                  aria-label="View our factory location on Google Maps"
                >
                  <span className="mt-0.5 text-primary">
                    {/* Map pin icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </span>
                  <span>
                    <span className="block text-body-sm text-on-surface group-hover:text-primary transition-colors">
                      {SITE.address.lines.join(", ")}
                    </span>
                    <span className="text-body-sm text-outline">
                      Open in Google Maps
                    </span>
                  </span>
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-label-caps text-on-surface-variant mb-2">
              Business hours
            </p>
            <p className="text-body-sm text-on-surface-variant">{SITE.hours}</p>
          </div>
        </div>

        {/* Right column — enquiry form */}
        <div>
          <p className="text-label-caps text-on-surface-variant mb-4">
            Send us a message
          </p>
          <ContactForm />
        </div>
      </div>

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </div>
  );
}
