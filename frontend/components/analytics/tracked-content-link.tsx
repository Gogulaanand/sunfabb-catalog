"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { trackSelectContent } from "@/lib/analytics";

interface TrackedContentLinkProps extends ComponentProps<typeof Link> {
  contentType: "homepage_cta" | "homepage_support";
  contentId: string;
  linkLocation: string;
}

/** Internal navigation that preserves normal Link behaviour and reports its source. */
export function TrackedContentLink({
  contentType,
  contentId,
  linkLocation,
  onClick,
  ...linkProps
}: TrackedContentLinkProps) {
  return (
    <Link
      {...linkProps}
      onClick={(event) => {
        trackSelectContent({ contentType, contentId, linkLocation });
        onClick?.(event);
      }}
    />
  );
}
