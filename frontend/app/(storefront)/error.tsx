"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Reveal } from "@/components/motion";

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section
      className="min-h-[28rem] px-5 py-24 md:px-(--spacing-margin-desktop) md:py-32"
      aria-labelledby="storefront-error-title"
    >
      <Reveal className="mx-auto flex max-w-xl flex-col items-center text-center">
        <p className="text-label-caps text-primary">A little interruption</p>
        <div className="my-6 h-px w-16 bg-primary" aria-hidden="true" />
        <h1
          id="storefront-error-title"
          className="font-display text-headline-md-mobile text-on-surface md:text-headline-md"
        >
          We&apos;ll find our way back.
        </h1>
        <p className="mt-5 max-w-md text-body-md text-on-surface-variant">
          This page did not finish setting the table. Try again, or take a
          moment to browse the collection while we reset things.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-primary px-6 py-3 text-label-caps text-on-primary transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Try again
          </button>
          <Link
            href="/catalog"
            className="rounded-full border border-outline-variant px-6 py-3 text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Browse catalog
          </Link>
          <Link
            href="/"
            className="rounded-full border border-outline-variant px-6 py-3 text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Return home
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
