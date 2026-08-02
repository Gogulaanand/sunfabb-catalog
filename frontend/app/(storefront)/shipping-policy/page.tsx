import type { Metadata } from "next";
import {
  TrustContactPrompt,
  TrustPage,
  TrustPageSection,
} from "@/components/trust/TrustPage";
import { SITE_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Shipping",
  description:
    "Shipping information for the Sunfabb India catalog. Coverage, charges and delivery timing are pending owner confirmation.",
  alternates: { canonical: SITE_URL + "/shipping-policy" },
};

export default function ShippingPolicyPage() {
  return (
    <TrustPage
      path="/shipping-policy"
      eyebrow="Shipping"
      title="Shipping information"
      intro="Shipping details are being finalized for the Sunfabb catalog. We are keeping this page explicit about what has not yet been confirmed."
    >
      <TrustPageSection title="What is currently confirmed">
        <p>
          Sunfabb is an India-focused catalog and displays prices in Indian
          Rupees.
        </p>
        <p>
          The catalog does not currently publish a shipping promise on this
          page.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Details awaiting owner confirmation">
        <p>
          Shipping coverage, charges, dispatch expectations, delivery windows,
          tracking and exceptions will be added after the owner confirms the
          operational terms.
        </p>
        <p>
          No delivery timeline or service-region promise should be inferred
          from this catalog page.
        </p>
      </TrustPageSection>

      <TrustContactPrompt />
    </TrustPage>
  );
}
