"use client";

import type { ReactNode } from "react";
import { useCatalogTransition } from "./CatalogTransitionContext";

export default function CatalogPendingGrid({ children }: { children: ReactNode }) {
  const { isPending } = useCatalogTransition();
  return (
    <div
      aria-busy={isPending}
      className={`transition-opacity duration-200 ${isPending ? "opacity-50" : "opacity-100"}`}
    >
      {children}
    </div>
  );
}
