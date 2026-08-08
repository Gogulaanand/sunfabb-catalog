import type { Metadata } from 'next';
import {
  TrustContactPrompt,
  TrustPage,
  TrustPageSection,
} from '@/components/trust/TrustPage';
import { SITE, SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Terms',
  description:
    'Terms for using the Sunfabb catalog and placing home-textile orders in India.',
  alternates: { canonical: SITE_URL + '/terms' },
};

export default function TermsPage() {
  return (
    <TrustPage
      path="/terms"
      eyebrow="Terms"
      title="Terms information"
      intro="These terms apply to your use of the Sunfabb website and to orders placed through it. They should be read with the product, shipping, returns and privacy pages."
    >
      <TrustPageSection title="About Sunfabb and contact">
        <p>
          Sunfabb is the brand used on this website for home-textile products.
          Our contact location is {SITE.address.lines.join(', ')}. You can
          contact us at {SITE.email} or {SITE.phone.display} during {SITE.hours}
          .
        </p>
        <p>
          The legal seller name, applicable GST details and tax breakdown will
          be shown on the invoice or order confirmation where required. Ask us
          before ordering if you need seller or tax details for your records.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Catalog information and orders">
        <p>
          Product descriptions, images, prices, stock and delivery estimates are
          provided in good faith and may change. We will correct material errors
          where identified. An order is accepted only when we confirm it;
          payment or an automated acknowledgement alone does not require us to
          supply an item that is unavailable or materially mispriced.
        </p>
        <p>
          You must provide accurate account, contact and delivery information.
          Do not use the website to submit unlawful, abusive, deceptive or
          malicious content, or to probe, scrape or disrupt the service.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Payment, delivery and returns">
        <p>
          Payment is processed through the payment provider shown at checkout.
          Shipping, returns, replacements and refunds are governed by the
          policies linked in the site footer and the terms shown with your
          order. Mandatory consumer rights remain unaffected.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Questions and complaints">
        <p>
          Please send order, delivery, return or service complaints to{' '}
          {SITE.email} or call {SITE.phone.display}. We will review the issue
          and respond through the contact details you provide.
        </p>
        <p>
          Before full live e-commerce launch, the legal seller name and the
          appointed grievance-officer name and contact details must be confirmed
          and added to this page where required. They are not guessed here.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Content and third-party services">
        <p>
          Sunfabb owns or has permission to use the site content unless stated
          otherwise. You may view the site for personal, non-commercial use but
          may not copy, republish or commercially exploit its content without
          permission. The site may rely on third-party services for hosting,
          payments, email, maps, security and delivery; their own terms may also
          apply.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Applicable law and updates">
        <p>
          These terms are governed by applicable Indian law. We may update them
          when the site, products or legal requirements change; the version
          published when an order is accepted will apply to that order, subject
          to mandatory consumer protections.
        </p>
      </TrustPageSection>

      <TrustContactPrompt />
    </TrustPage>
  );
}
