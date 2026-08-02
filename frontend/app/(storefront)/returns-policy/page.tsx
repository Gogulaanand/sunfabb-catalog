import type { Metadata } from "next";
import {
  TrustContactPrompt,
  TrustPage,
  TrustPageSection,
} from "@/components/trust/TrustPage";
import { SITE_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Returns",
  description:
    "Returns information for the Sunfabb catalog. Eligibility, timelines and return costs are pending owner and legal confirmation.",
  alternates: { canonical: SITE_URL + "/returns-policy" },
};

export default function ReturnsPolicyPage() {
  return (
    <TrustPage
      path="/returns-policy"
      eyebrow="Returns"
      title="Returns information"
      intro="Return and refund details are intentionally not stated until the owner confirms the policy and a legal reviewer checks its wording."
    >
      <TrustPageSection title="Why this page is limited for now">
        <p>
          A return policy needs confirmed answers about eligibility, the return
          window, item condition, exclusions, refunds and who pays return
          shipping.
        </p>
        <p>
          Those details are not available in the repository, so this page does
          not publish a guessed deadline or condition.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Before the policy is published">
        <p>
          Please use the contact route for an enquiry about a product or an
          existing conversation. The owner can provide the applicable answer
          directly while the written policy is being reviewed.
        </p>
      </TrustPageSection>

      <TrustContactPrompt />
    </TrustPage>
  );
}
