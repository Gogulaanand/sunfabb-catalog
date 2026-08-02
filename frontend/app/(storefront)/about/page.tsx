import type { Metadata } from "next";
import {
  TrustContactPrompt,
  TrustPage,
  TrustPageSection,
} from "@/components/trust/TrustPage";
import { SITE_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn what Sunfabb is: an India-focused catalog for bedspreads, towels, napkins and table linen, with prices shown in INR.",
  alternates: { canonical: SITE_URL + "/about" },
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

      <TrustPageSection title="Business information still being confirmed">
        <p>
          Sunfabb&apos;s legal entity name, registered address, GSTIN and
          customer-service contact details are not published here until the
          owner confirms them.
        </p>
        <p>
          This keeps the catalog useful without presenting an unverified legal
          identity as fact.
        </p>
      </TrustPageSection>

      <TrustContactPrompt />
    </TrustPage>
  );
}
