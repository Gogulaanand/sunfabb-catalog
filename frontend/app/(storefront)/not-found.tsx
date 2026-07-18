import Link from "next/link";
import { Reveal } from "@/components/motion";

export default function StorefrontNotFound() {
  return (
    <section
      className="min-h-[28rem] px-5 py-24 md:px-(--spacing-margin-desktop) md:py-32"
      aria-labelledby="not-found-title"
    >
      <Reveal className="mx-auto flex max-w-xl flex-col items-center text-center">
        <p className="text-label-caps text-primary">A quiet corner</p>
        <div className="my-6 h-px w-16 bg-primary" aria-hidden="true" />
        <h1
          id="not-found-title"
          className="font-display text-headline-md-mobile text-on-surface md:text-headline-md"
        >
          This page has wandered off.
        </h1>
        <p className="mt-5 max-w-md text-body-md text-on-surface-variant">
          The piece you were looking for is not here, but there are still
          plenty of beautiful things to discover.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/catalog"
            className="rounded-full bg-primary px-6 py-3 text-label-caps text-on-primary transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
