import type { ReactNode } from "react";
import Link from "next/link";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { Reveal } from "@/components/motion";
import { SITE_URL } from "@/lib/site-config";

interface TrustPageProps {
  path: string;
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}

interface TrustPageSectionProps {
  title: string;
  children: ReactNode;
}

export function TrustPage({
  path,
  eyebrow,
  title,
  intro,
  children,
}: TrustPageProps) {
  return (
    <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-(--spacing-margin-mobile) md:py-16">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: SITE_URL + "/" },
          { name: title, url: SITE_URL + path },
        ]}
      />

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
        <span className="text-on-surface">{title}</span>
      </nav>

      <Reveal>
        <div className="max-w-2xl">
          <p className="text-label-caps uppercase text-primary mb-3">
            {eyebrow}
          </p>
          <h1 className="font-display text-headline-md-mobile md:text-headline-md text-on-surface mb-4">
            {title}
          </h1>
          <p className="text-body-md text-on-surface-variant mb-12">
            {intro}
          </p>

          <div className="space-y-10">{children}</div>
        </div>
      </Reveal>
    </div>
  );
}

export function TrustPageSection({ title, children }: TrustPageSectionProps) {
  return (
    <section>
      <h2 className="font-display text-title-sm text-on-surface mb-3">
        {title}
      </h2>
      <div className="space-y-3 text-body-md text-on-surface-variant">
        {children}
      </div>
    </section>
  );
}

export function TrustContactPrompt() {
  return (
    <div className="border-t border-outline-variant pt-8 text-body-md text-on-surface-variant">
      Questions about the catalog?{" "}
      <Link
        href="/contact"
        className="text-primary underline underline-offset-4 hover:text-primary-container transition-colors"
      >
        Contact Sunfabb
      </Link>
      .
    </div>
  );
}
