"use client";

import React from "react";
import { type ReactNode, useEffect, useState } from "react";
import { motion, useInView, type Variants } from "motion/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

// ============================================================
// Constants
// ============================================================

/** Apple-style cubic bezier easing */
export const APPLE_EASE = [0.22, 1, 0.36, 1] as const;

// ============================================================
// Fade-in variants (scroll-triggered)
// ============================================================

export const FADE_IN_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [...APPLE_EASE],
    },
  },
};

// ============================================================
// Stagger container / item variants
// ============================================================

export const STAGGER_CONTAINER_VARIANTS: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const STAGGER_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [...APPLE_EASE],
    },
  },
};

// ============================================================
// Card hover variants
// ============================================================

export const CARD_HOVER_VARIANTS: Variants = {
  rest: {
    y: 0,
    boxShadow:
      "0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
    transition: {
      duration: 0.3,
      ease: [...APPLE_EASE],
    },
  },
  hover: {
    y: -4,
    boxShadow:
      "0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.04)",
    transition: {
      duration: 0.3,
      ease: [...APPLE_EASE],
    },
  },
};

// ============================================================
// Hook: use reduced motion preference
// ============================================================

/**
 * SSR-safe hook that returns true if the user prefers reduced motion.
 * Returns false during SSR and initial hydration to avoid mismatches,
 * then updates on the client after mount.
 */
function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}

// ============================================================
// Component: FadeIn
// ============================================================

interface FadeInProps {
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Scroll-triggered fade-in animation component.
 * Elements fade in (opacity 0→1, y 20→0) when entering viewport.
 * Plays only once. Respects `prefers-reduced-motion`.
 */
export function FadeIn({ children, className }: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={prefersReducedMotion ? false : "hidden"}
      animate={
        prefersReducedMotion ? { opacity: 1, y: 0 } : isInView ? "visible" : "hidden"
      }
      variants={FADE_IN_VARIANTS}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// Component: StaggeredList
// ============================================================

interface StaggeredListProps {
  children: ReactNode;
  className?: string;
}

/**
 * Parent container that staggers children animations with 100ms delay.
 * Use with `StaggeredItem` children for cascading reveal.
 * Respects `prefers-reduced-motion`.
 */
export function StaggeredList({ children, className }: StaggeredListProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={prefersReducedMotion ? false : "hidden"}
      animate={
        prefersReducedMotion ? "visible" : isInView ? "visible" : "hidden"
      }
      variants={
        prefersReducedMotion
          ? { hidden: {}, visible: {} }
          : STAGGER_CONTAINER_VARIANTS
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// Component: StaggeredItem
// ============================================================

interface StaggeredItemProps {
  children: ReactNode;
  className?: string;
}

/**
 * Individual item within a StaggeredList. Each item fades in
 * with the cascading delay controlled by the parent.
 */
export function StaggeredItem({ children, className }: StaggeredItemProps) {
  return (
    <motion.div variants={STAGGER_ITEM_VARIANTS} className={className}>
      {children}
    </motion.div>
  );
}

// ============================================================
// Component: CardHover
// ============================================================

interface CardHoverProps {
  children: ReactNode;
  className?: string;
}

/**
 * Card with lift hover animation: translateY -4px + shadow increase.
 * Smooth transition using Apple easing.
 * Respects `prefers-reduced-motion`.
 */
export function CardHover({ children, className }: CardHoverProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-card transition-colors",
          className,
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      animate="rest"
      variants={CARD_HOVER_VARIANTS}
      className={cn(
        "cursor-pointer rounded-xl border border-border bg-card",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
