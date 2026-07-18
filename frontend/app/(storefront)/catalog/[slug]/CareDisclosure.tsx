"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface CareDisclosureProps {
  instructions: string;
}

export function CareDisclosure({ instructions }: CareDisclosureProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pt-6 border-t border-outline-variant">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-title-sm text-on-surface mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
      >
        <span>Care Instructions</span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="text-on-surface-variant text-sm leading-none"
        >
          ▾
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="care-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="text-body-sm text-on-surface-variant leading-relaxed pb-1">
              {instructions}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
