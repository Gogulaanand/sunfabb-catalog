import Link from "next/link";
import { SITE, whatsappLink, telLink, mailtoLink } from "@/lib/site-config";

export default function Footer() {
  return (
    <footer className="border-t border-outline-variant bg-surface-container-low">
      <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
          {/* Brand column */}
          <div>
            <p className="font-display text-xl text-primary mb-2">{SITE.name}</p>
            <p className="text-body-sm text-on-surface-variant max-w-xs">
              Premium bedspreads, towels, napkins and table linen — made in India, built to last.
            </p>
          </div>

          {/* Contact column */}
          <div>
            <p className="text-label-caps text-on-surface-variant mb-3">Contact</p>
            <ul className="space-y-2 text-body-sm text-on-surface-variant">
              <li>
                <a
                  href={telLink}
                  className="hover:text-primary transition-colors"
                  aria-label={`Call us at ${SITE.phone.display}`}
                >
                  {SITE.phone.display}
                </a>
              </li>
              <li>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                  aria-label="Chat with us on WhatsApp"
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href={mailtoLink}
                  className="hover:text-primary transition-colors"
                >
                  {SITE.email}
                </a>
              </li>
              <li>
                <a
                  href={SITE.address.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                  aria-label="View our location on Google Maps"
                >
                  Find us on Maps
                </a>
              </li>
              <li className="text-outline">{SITE.hours}</li>
            </ul>
          </div>

          {/* Social + links column */}
          <div>
            <p className="text-label-caps text-on-surface-variant mb-3">Follow</p>
            <div className="flex items-center gap-4 mb-4">
              <a
                href={SITE.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Sunfabb on Instagram"
                className="text-on-surface-variant hover:text-primary transition-colors"
              >
                {/* Inline SVG Instagram icon — no external dependency */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat with Sunfabb on WhatsApp"
                className="text-on-surface-variant hover:text-primary transition-colors"
              >
                {/* Inline SVG WhatsApp icon */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </a>
            </div>
            <Link
              href="/contact"
              className="text-body-sm text-on-surface-variant hover:text-primary transition-colors"
            >
              Send us a message →
            </Link>
          </div>
        </div>

        <p className="text-body-sm text-outline border-t border-outline-variant pt-6">
          © {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
