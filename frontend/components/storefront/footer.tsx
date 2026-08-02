import Link from "next/link";
import {
  SITE,
  TRUST_PAGE_LINKS,
  mailtoLink,
  telLink,
  whatsappLink,
} from "@/lib/site-config";

export default function Footer() {
  const whatsappHref = whatsappLink();
  const hasAddress =
    SITE.address.lines.length > 0 && Boolean(SITE.address.mapsUrl);
  const columnCountClass =
    SITE.socialProfiles.length > 0 ? "lg:grid-cols-4" : "lg:grid-cols-3";

  return (
    <footer className="border-t border-outline-variant bg-surface-container-low">
      <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-12">
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 ${columnCountClass} gap-8 mb-10`}
        >
          {/* Brand column */}
          <div>
            <p className="font-display text-xl text-primary mb-2">{SITE.name}</p>
            <p className="text-body-sm text-on-surface-variant max-w-xs">
              Premium bedspreads, towels, napkins and table linen — made in
              India, built to last.
            </p>
          </div>

          {/* Contact column */}
          <div>
            <p className="text-label-caps text-on-surface-variant mb-3">
              Contact
            </p>
            <ul className="space-y-2 text-body-sm text-on-surface-variant">
              {SITE.phone.display && telLink && (
                <li>
                  <a
                    href={telLink}
                    className="hover:text-primary transition-colors"
                    aria-label={`Call us at ${SITE.phone.display}`}
                  >
                    {SITE.phone.display}
                  </a>
                </li>
              )}
              {whatsappHref && (
                <li>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                    aria-label="Chat with us on WhatsApp"
                  >
                    WhatsApp
                  </a>
                </li>
              )}
              {SITE.email && mailtoLink && (
                <li>
                  <a
                    href={mailtoLink}
                    className="hover:text-primary transition-colors"
                  >
                    {SITE.email}
                  </a>
                </li>
              )}
              {hasAddress && (
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
              )}
              {SITE.hours && <li className="text-outline">{SITE.hours}</li>}
              <li>
                <Link
                  href="/contact"
                  className="hover:text-primary transition-colors"
                >
                  Contact us
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust and learning links */}
          <div>
            <p className="text-label-caps text-on-surface-variant mb-3">
              Trust &amp; help
            </p>
            <ul className="space-y-2 text-body-sm text-on-surface-variant">
              {TRUST_PAGE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/faq"
                  className="hover:text-primary transition-colors"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/guides"
                  className="hover:text-primary transition-colors"
                >
                  Guides
                </Link>
              </li>
            </ul>
          </div>

          {/* Social profiles are omitted until the owner configures real,
              active profiles. */}
          {SITE.socialProfiles.length > 0 && (
            <div>
              <p className="text-label-caps text-on-surface-variant mb-3">
                Follow
              </p>
              <ul className="flex flex-wrap items-center gap-4">
                {SITE.socialProfiles.map((profile) => (
                  <li key={profile.provider}>
                    <a
                      href={profile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Sunfabb on ${profile.provider}`}
                      className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden="true"
                      >
                        <path d="M4 12h16M12 4l8 8-8 8" />
                      </svg>
                      <span>{profile.provider}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <p className="text-body-sm text-outline border-t border-outline-variant pt-6">
          © {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
