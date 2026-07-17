"use client";

import { useEffect } from "react";
import Link from "next/link";

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
    <div className="max-w-(--spacing-container-max) mx-auto px-5 md:px-(--spacing-margin-desktop) py-24 text-center">
      <p className="font-display text-headline-sm text-primary mb-4">
        Something went wrong
      </p>
      <p className="text-body-md text-on-surface-variant mb-8 max-w-md mx-auto">
        We couldn&apos;t load this page. Please try again or return home.
      </p>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-full bg-primary text-on-primary text-label-caps hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-6 py-2.5 rounded-full border border-outline-variant text-on-surface-variant text-label-caps hover:border-primary transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
