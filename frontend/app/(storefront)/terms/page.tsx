import type { Metadata } from "next";
import {
  TrustContactPrompt,
  TrustPage,
  TrustPageSection,
} from "@/components/trust/TrustPage";
import { SITE_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Terms information for the Sunfabb catalog. The final customer terms are pending owner and legal confirmation.",
  alternates: { canonical: SITE_URL + "/terms" },
};

export default function TermsPage() {
  return (
    <TrustPage
      path="/terms"
      eyebrow="Terms"
      title="Terms information"
      intro="The final customer terms are pending owner and legal review. This page avoids presenting generic wording as Sunfabb&apos;s contract."
    >
      <TrustPageSection title="What still needs confirmation">
        <p>
          The owner or legal reviewer must confirm the seller identity, how an
          enquiry or future order is formed, pricing and availability, use of
          site content, limitations, dispute handling and governing law.
        </p>
        <p>
          None of those unconfirmed terms are presented as binding conditions
          on this page.
        </p>
      </TrustPageSection>

      <TrustPageSection title="Using the catalog while this is reviewed">
        <p>
          Visitors can browse the catalog and use the contact route for
          questions. Product-specific information should be checked on the
          relevant product page or confirmed directly with Sunfabb.
        </p>
      </TrustPageSection>

      <TrustContactPrompt />
    </TrustPage>
  );
}
