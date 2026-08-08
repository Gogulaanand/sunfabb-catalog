import type { Metadata } from 'next';
import {
  TrustContactPrompt,
  TrustPage,
  TrustPageSection,
} from '@/components/trust/TrustPage';
import { SITE, SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Returns',
  description:
    'Returns, replacements and refunds for Sunfabb home-textile orders.',
  alternates: { canonical: SITE_URL + '/returns-policy' },
};

export default function ReturnsPolicyPage() {
  return (
    <TrustPage
      path="/returns-policy"
      eyebrow="Returns"
      title="Returns information"
      intro="We want you to receive the product you ordered in good condition. This working policy explains the usual return, replacement and refund process for the current catalogue release; final wording will be updated before full live e-commerce and remains subject to the product page, order confirmation and applicable law."
    >
      <TrustPageSection title="When you can request a return">
        <p>
          Unless your order confirmation or product page says otherwise, ask for
          a return within 7 calendar days after delivery. The item should be
          unused, unwashed, unaltered, in resalable condition and returned with
          its original packaging, labels and included accessories.
        </p>
        <p>
          Personalised, cut, altered or custom-made items, and items that have
          been used or washed, are normally not eligible for a change-of-mind
          return. This does not limit any remedy that cannot lawfully be
          excluded for a defective, damaged, misdescribed or incorrectly
          supplied product.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Damaged, defective or incorrect items">
        <p>
          Contact us at {SITE.email} or {SITE.phone.display} as soon as
          reasonably possible, preferably within 48 hours of delivery, with your
          order number and clear photographs. Please keep the item and packaging
          until we tell you what to do next. We may offer a replacement, repair
          or refund depending on the issue and stock.
        </p>
      </TrustPageSection>

      <TrustPageSection title="How to request a return">
        <p>
          Send the order number, the item you want to return and the reason
          through the contact page. We will confirm eligibility and provide
          return instructions before you send anything back. Do not courier a
          return to the address on this page without our written instructions.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Refunds and return shipping">
        <p>
          After the returned item is received and checked, an approved refund is
          normally initiated to the original payment method within 5–7 business
          days. Your bank or payment provider may take additional time to credit
          it. For a change-of-mind return, the customer may be responsible for
          reasonable return shipping; defective, damaged or incorrect items will
          be handled by Sunfabb as appropriate.
        </p>
        <p>
          Nothing in this policy removes rights or remedies available under
          applicable consumer law.
        </p>
      </TrustPageSection>

      <TrustContactPrompt />
    </TrustPage>
  );
}
