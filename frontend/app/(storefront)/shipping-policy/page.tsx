import type { Metadata } from 'next';
import {
  TrustContactPrompt,
  TrustPage,
  TrustPageSection,
} from '@/components/trust/TrustPage';
import { SITE, SITE_URL } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Shipping',
  description:
    'Shipping information for Sunfabb orders in India, including processing, delivery estimates and address changes.',
  alternates: { canonical: SITE_URL + '/shipping-policy' },
};

export default function ShippingPolicyPage() {
  return (
    <TrustPage
      path="/shipping-policy"
      eyebrow="Shipping"
      title="Shipping information"
      intro="This working policy applies to purchases placed through Sunfabb for delivery within India. Final wording will be updated before full live e-commerce. Delivery dates are estimates and depend on the destination, stock and carrier serviceability."
    >
      <TrustPageSection title="Coverage and charges">
        <p>
          We ship to serviceable Indian PIN codes. Availability, any shipping
          charge and the estimated delivery date will be shown or confirmed
          during checkout or in the order confirmation. If a PIN code cannot be
          served, we will tell you before accepting the order.
        </p>
        <p>
          Prices are shown in Indian Rupees. Any shipping charge, including a
          zero-charge delivery offer, will be shown or confirmed before the
          order is accepted and is payable with the order where applicable.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Processing and delivery">
        <p>
          Orders are processed after payment confirmation and stock validation.
          We will make reasonable efforts to dispatch within the timeframe shown
          in your order confirmation. Carrier delays, weather, strikes, service
          interruptions and incorrect or incomplete address details can extend
          delivery.
        </p>
        <p>
          Tracking details will be shared when the carrier provides them. If a
          shipment is delayed or appears lost, contact us at {SITE.email} or{' '}
          {SITE.phone.display} and we will investigate with the carrier.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Address changes and delivery attempts">
        <p>
          Check the delivery address carefully before placing an order. Contact
          us as soon as possible if it needs correction; a change may not be
          possible after dispatch. Re-delivery or return-to-origin charges
          caused by an incorrect address or an unavailable recipient may be
          deducted from a refund where applicable and where permitted by law.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Questions">
        <p>
          For a delivery estimate before ordering, contact Sunfabb during our
          service hours: {SITE.hours}.
        </p>
      </TrustPageSection>

      <TrustContactPrompt />
    </TrustPage>
  );
}
