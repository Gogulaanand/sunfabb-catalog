import type { Metadata } from 'next';
import {
  TrustContactPrompt,
  TrustPage,
  TrustPageSection,
} from '@/components/trust/TrustPage';
import { SITE, SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn what Sunfabb is: an India-focused catalog for bedspreads, towels, napkins and table linen, with prices shown in INR.',
  alternates: { canonical: SITE_URL + '/about' },
};

export default function AboutPage() {
  return (
    <TrustPage
      path="/about"
      eyebrow="About Sunfabb"
      title="Home textiles for Indian homes"
      intro="Sunfabb is an India-focused catalog for home textiles. Browse bedspreads, towels, napkins and table linen with prices shown in Indian Rupees."
    >
      <TrustPageSection title="What you can find here">
        <p>
          The catalog brings together everyday home-textile categories in one
          place, with product pages for reviewing available details before you
          enquire.
        </p>
        <p>
          Product-specific information belongs on each product page. When a
          detail is not available there, please ask through the contact route
          rather than relying on an assumption.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Business information">
        <p>
          Sunfabb is the home-textiles brand presented through this catalog. The
          legal seller name and tax details, where applicable, appear on the
          invoice or order confirmation rather than being published as general
          marketing copy.
        </p>
        <p>
          For enquiries, you can reach us at {SITE.email} or{' '}
          {SITE.phone.display}. Our customer-service hours are {SITE.hours}.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Our contact location">
        <p>{SITE.address.lines.join(', ')}</p>
        <p>
          This is the contact location for Sunfabb. Please use the Google Maps
          link on the contact page before visiting; this catalog is not a
          walk-in retail appointment system.
        </p>
      </TrustPageSection>

      <TrustContactPrompt />
    </TrustPage>
  );
}
