"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { useCatalogTransition } from "./CatalogTransitionContext";

export default function CatalogPendingGrid({ children }: { children: ReactNode }) {
  const { isPending } = useCatalogTransition();
  return (
    <motion.div
      aria-busy={isPending}
      animate={{ opacity: isPending ? 0.4 : 1 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
