import type { Metadata } from 'next';
import {
  TrustContactPrompt,
  TrustPage,
  TrustPageSection,
} from '@/components/trust/TrustPage';
import { SITE, SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'How Sunfabb collects, uses and protects contact, account and order information.',
  alternates: { canonical: SITE_URL + '/privacy-policy' },
};

export default function PrivacyPolicyPage() {
  return (
    <TrustPage
      path="/privacy-policy"
      eyebrow="Privacy"
      title="Privacy information"
      intro="This working privacy notice explains the information Sunfabb may handle when you browse the catalog, contact us, create an account or place an order in India. Final wording will be updated before full live e-commerce."
    >
      <TrustPageSection title="Information we may collect">
        <p>
          For an enquiry, we may receive your name, phone number, optional email
          address and message. For an account or order, we may handle account,
          delivery, order, invoice and customer-support details. Payment card,
          UPI and banking credentials are handled by the payment provider and
          are not intended to be stored by Sunfabb.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Why we use it">
        <p>
          We use information to answer enquiries, create and secure accounts,
          process orders, arrange delivery, issue invoices, provide support,
          prevent abuse and comply with legal or accounting obligations. We do
          not sell enquiry or customer details for advertising. We will not use
          them for promotional messages unless you separately ask for or permit
          that use, and you can withdraw that permission.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Service providers and sharing">
        <p>
          We may share the minimum necessary information with providers that
          support the service, such as hosting and database providers, the
          payment provider, delivery partners, transactional email provider,
          Cloudflare Turnstile and Google Maps links. They receive information
          only for the service they provide or where law requires it.
        </p>
        <p>
          Optional analytics may be enabled in the future. If enabled, it will
          be configured and disclosed separately. Do not enter payment secrets,
          passwords or unnecessary sensitive information in the contact form.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Security and retention">
        <p>
          We use access controls, validation and reasonable technical and
          organisational safeguards. No internet service can promise absolute
          security. We retain information only for as long as needed for the
          stated purpose, customer support, tax/accounting records, dispute
          handling or legal obligations, then delete or anonymise it where
          practical.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Questions and requests">
        <p>
          For a privacy question, correction request, deletion request or
          marketing opt-out, contact {SITE.email} or write to{' '}
          {SITE.address.lines.join(', ')}. We may need to verify your identity
          and may retain information where required for an order, tax record,
          fraud prevention or legal claim.
        </p>
        <p>
          This notice is intended to be transparent and practical. It should be
          reviewed against the Digital Personal Data Protection Act, 2023, the
          applicable Rules and any sector-specific requirements before a final
          production launch.
        </p>
      </TrustPageSection>

      <TrustContactPrompt />
    </TrustPage>
  );
}
