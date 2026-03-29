"use client";

import { motion } from "motion/react";

const APPLE_EASE = [0.22, 1, 0.36, 1] as const;

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: APPLE_EASE,
      }}
    >
      {children}
    </motion.div>
  );
}
