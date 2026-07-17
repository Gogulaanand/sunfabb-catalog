"use client";

import { motion } from "motion/react";

interface StaggerGroupProps {
  children: React.ReactNode;
  className?: string;
}

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07 },
  },
};

export function StaggerGroup({ children, className }: StaggerGroupProps) {
  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      {children}
    </motion.div>
  );
}
