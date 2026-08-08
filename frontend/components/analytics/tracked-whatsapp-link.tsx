"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { trackWhatsAppClick, type WhatsAppClickParams } from "@/lib/analytics";

interface TrackedWhatsAppLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "onClick"> {
  children: ReactNode;
  tracking: WhatsAppClickParams;
}

/** A normal anchor that records the WhatsApp conversion before navigation. */
export function TrackedWhatsAppLink({
  children,
  tracking,
  ...anchorProps
}: TrackedWhatsAppLinkProps) {
  return (
    <a
      {...anchorProps}
      onClick={() => {
        trackWhatsAppClick(tracking);
      }}
    >
      {children}
    </a>
  );
}
