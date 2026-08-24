import Link from 'next/link';
import {
  SITE,
  mailtoLink,
  telLink,
  whatsappLink,
} from '@/lib/site-config';
import { TrackedWhatsAppLink } from '@/components/analytics/tracked-whatsapp-link';

const SHOP_LINKS = [
  { href: '/catalog?category=bedspreads', label: 'Bedspreads' },
  { href: '/catalog?category=towels', label: 'Towels' },
  { href: '/catalog?category=table-linen', label: 'Table Linen' },
  { href: '/catalog?category=table-linen', label: 'Napkins' },
] as const;

const HELP_LINKS = [
  { href: '/shipping-policy', label: 'Shipping' },
  { href: '/returns-policy', label: 'Returns' },
  { href: '/guides', label: 'Materials Guide' },
  { href: '/guides/how-to-wash-cotton-bedspreads', label: 'Care Guide' },
  { href: '/faq', label: 'FAQ' },
] as const;

export default function Footer() {
  const whatsappHref = whatsappLink();
  const hasAddress = SITE.address.lines.length > 0 && Boolean(SITE.address.mapsUrl);
  const instagram = SITE.socialProfiles.find(
    (profile) => profile.provider === 'Instagram',
  );
  const linkClass =
    'transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-home-graphite';

  return (
    <footer className="border-t border-white/15 bg-home-graphite text-white/65">
      <div className="mx-auto max-w-(--spacing-container-max) px-5 py-16 md:px-(--spacing-margin-desktop) md:py-24">
        <div className="grid gap-12 border-b border-white/20 pb-14 md:grid-cols-[1fr_auto] md:gap-20 md:pb-16">
          <div>
            <p className="font-display text-2xl font-medium tracking-[-0.03em] text-white">
              SUNFABB
            </p>
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">
              Bedspreads, towels, napkins and table linen from India.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-12 sm:grid-cols-3 md:gap-x-20 lg:gap-x-24">
            <div>
              <h2 className="font-label mb-6 text-xs font-bold uppercase tracking-[0.16em] text-white">
                Shop
              </h2>
              <ul className="space-y-4 text-sm">
                {SHOP_LINKS.map((link) => (
                  <li key={`${link.label}-${link.href}`}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-label mb-6 text-xs font-bold uppercase tracking-[0.16em] text-white">
                Help
              </h2>
              <ul className="space-y-4 text-sm">
                {HELP_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-label mb-6 text-xs font-bold uppercase tracking-[0.16em] text-white">
                Contact
              </h2>
              <ul className="space-y-4 text-sm">
                {whatsappHref && (
                  <li>
                    <TrackedWhatsAppLink
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      tracking={{ linkLocation: 'footer' }}
                      className={linkClass}
                      aria-label="Chat with us on WhatsApp"
                    >
                      WhatsApp Us
                    </TrackedWhatsAppLink>
                  </li>
                )}
                {SITE.email && mailtoLink && (
                  <li>
                    <a href={mailtoLink} className={linkClass}>
                      Email Us
                    </a>
                  </li>
                )}
                {SITE.phone.display && telLink && (
                  <li>
                    <a
                      href={telLink}
                      className={linkClass}
                      aria-label={`Call us at ${SITE.phone.display}`}
                    >
                      {SITE.phone.display}
                    </a>
                  </li>
                )}
                {hasAddress && (
                  <li>
                    <a
                      href={SITE.address.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                      aria-label="Find us on Maps"
                    >
                      Find us on Maps
                    </a>
                  </li>
                )}
                {instagram && (
                  <li>
                    <a
                      href={instagram.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                    >
                      Instagram
                    </a>
                  </li>
                )}
                <li>
                  <Link href="/contact" className={linkClass}>
                    Contact us
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="font-label flex flex-col gap-5 pt-7 text-[0.6875rem] uppercase tracking-[0.12em] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} SUNFABB</span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link href="/about" className={linkClass}>About Sunfabb</Link>
            <Link href="/privacy-policy" className={linkClass}>Privacy</Link>
            <Link href="/terms" className={linkClass}>Terms</Link>
            <span>India / INR</span>
          </div>
        </div>
        {SITE.hours && (
          <p className="mt-5 text-sm text-inverse-on-surface/65">{SITE.hours}</p>
        )}
      </div>
    </footer>
  );
}
