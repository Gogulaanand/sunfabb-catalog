import type { Metadata } from "next";
import {
  TrustContactPrompt,
  TrustPage,
  TrustPageSection,
} from "@/components/trust/TrustPage";
import { SITE_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Privacy information for the Sunfabb catalog. The final data-use notice is pending owner and legal review.",
  alternates: { canonical: SITE_URL + "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <TrustPage
      path="/privacy-policy"
      eyebrow="Privacy"
      title="Privacy information"
      intro="The final privacy notice is being prepared with owner and legal review. This page does not fill the gaps with generic or unverified legal language."
    >
      <TrustPageSection title="What this catalog currently provides">
        <p>
          Sunfabb provides a browsable home-textiles catalog and a contact
          route for enquiries. The site may receive information that a visitor
          chooses to submit through that route.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Details awaiting review">
        <p>
          The owner or legal reviewer must confirm the data collected, why it
          is used, retention, sharing, security, cookies and the process for
          privacy questions or requests.
        </p>
        <p>
          Until those facts are confirmed, this page makes no claim about a
          legal basis, retention period or statutory rights process.
        </p>
      </TrustPageSection>

      <TrustContactPrompt />
    </TrustPage>
  );
}
