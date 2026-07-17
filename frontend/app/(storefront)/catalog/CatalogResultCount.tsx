"use client";

import { AnimatePresence, motion } from "motion/react";

interface CatalogResultCountProps {
  showing: number;
  total: number;
}

export function CatalogResultCount({ showing, total }: CatalogResultCountProps) {
  return (
    <p className="text-body-sm text-on-surface-variant mb-6">
      Showing{" "}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={`${showing}-${total}`}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className="inline-block"
        >
          {showing} of {total}
        </motion.span>
      </AnimatePresence>{" "}
      {total === 1 ? "item" : "items"}
    </p>
  );
}
