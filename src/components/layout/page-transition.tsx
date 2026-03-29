"use client";

import { motion, useReducedMotion } from "motion/react";

export const APPLE_EASE = [0.22, 1, 0.36, 1] as const;

type PageTransitionProps = {
  initial: { opacity: number; y: number } | false;
  animate: { opacity: number; y: number };
  transition: { duration: number; ease?: typeof APPLE_EASE };
};

export function getPageTransitionProps(
  prefersReducedMotion: boolean | null,
): PageTransitionProps {
  if (prefersReducedMotion) {
    return {
      initial: false,
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0 },
    };
  }

  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.3,
      ease: APPLE_EASE,
    },
  };
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  const transitionProps = getPageTransitionProps(prefersReducedMotion);

  return (
    <motion.div
      initial={transitionProps.initial}
      animate={transitionProps.animate}
      transition={transitionProps.transition}
    >
      {children}
    </motion.div>
  );
}
