import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { FaqSchema } from "@/components/seo/FaqSchema";
import { Reveal } from "@/components/motion";
import { FAQ_SECTIONS, FAQ_ENTRIES } from "./faq-content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sunfabb.com";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers on towel GSM, Indian bedspread sizing, tablecloth measurements, and how to wash and care for cotton home textiles.",
  alternates: { canonical: `${siteUrl}/faq` },
};

export default function FaqPage() {
  return (
    <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-(--spacing-margin-mobile) md:py-16">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: `${siteUrl}/` },
          { name: "FAQ", url: `${siteUrl}/faq` },
        ]}
      />
      <FaqSchema entries={FAQ_ENTRIES} />

      <nav
        aria-label="Breadcrumb"
        className="text-body-sm text-on-surface-variant mb-6"
      >
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-on-surface">FAQ</span>
      </nav>

      <div className="max-w-2xl">
        <h1 className="font-display text-headline-md-mobile md:text-headline-md text-on-surface mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-body-md text-on-surface-variant mb-12">
          Sizes, weights and wash routines. For anything not covered here,{" "}
          <Link
            href="/contact"
            className="text-primary underline underline-offset-4 hover:text-primary-container transition-colors"
          >
            get in touch
          </Link>
          .
        </p>

        {FAQ_SECTIONS.map((section) => (
          <section key={section.label} className="mb-14 last:mb-0">
            <p className="text-label-caps uppercase text-on-surface-variant mb-8">
              {section.label}
            </p>

            <div className="space-y-10">
              {section.entries.map((entry) => (
                <div key={entry.question}>
                  <h2 className="font-display text-title-sm text-on-surface mb-3">
                    {entry.question}
                  </h2>
                  <p className="text-body-md text-on-surface-variant">
                    {entry.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}

        <Reveal className="mt-16 pt-10 border-t border-outline-variant">
          <p className="text-body-md text-on-surface-variant">
            Our{" "}
            <Link
              href="/guides"
              className="text-primary underline underline-offset-4 hover:text-primary-container transition-colors"
            >
              guides
            </Link>{" "}
            go deeper on GSM, bedspread sizing, washing cotton, and setting a
            table.
          </p>
        </Reveal>
      </div>
    </div>
  );
}
