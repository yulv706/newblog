"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { cn } from "@/lib/utils";

type DailyMediaGalleryProps = {
  images: string[];
  closeLabel: string;
  previousLabel: string;
  nextLabel: string;
  countTemplate: string;
  positionTemplate: string;
};

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function DailyMediaGallery({
  images,
  closeLabel,
  previousLabel,
  nextLabel,
  countTemplate,
  positionTemplate,
}: DailyMediaGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const safeImages = images.slice(0, 4);
  const isOpen = activeIndex !== null;

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveIndex(null);
      } else if (event.key === "ArrowLeft") {
        setActiveIndex((current) =>
          current === null ? null : (current - 1 + safeImages.length) % safeImages.length
        );
      } else if (event.key === "ArrowRight") {
        setActiveIndex((current) => (current === null ? null : (current + 1) % safeImages.length));
      } else if (event.key === "Tab") {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            "button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])"
          ) ?? []
        );
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first || !last) {
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, [isOpen, safeImages.length]);

  if (safeImages.length === 0) {
    return null;
  }

  function openImage(index: number, trigger: HTMLElement) {
    restoreFocusRef.current = trigger;
    setActiveIndex(index);
  }

  const gallery = (
    <AnimatePresence>
      {activeIndex !== null ? (
        <motion.div
          ref={dialogRef}
          key="daily-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={interpolate(positionTemplate, {
            current: activeIndex + 1,
            total: safeImages.length,
          })}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22 }}
          className="fixed inset-0 z-[80] grid grid-rows-[auto_minmax(0,1fr)_auto] bg-black/94 text-white"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setActiveIndex(null);
            }
          }}
        >
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <span className="font-mono text-xs text-white/70">
              {interpolate(positionTemplate, {
                current: activeIndex + 1,
                total: safeImages.length,
              })}
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setActiveIndex(null)}
              aria-label={closeLabel}
              title={closeLabel}
              className="grid h-11 w-11 place-items-center rounded-full text-white/80 transition-colors outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>

          <div className="relative min-h-0 px-4 sm:px-16">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={safeImages[activeIndex]}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.985 }}
                transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                drag={safeImages.length > 1 && !reduceMotion ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.08}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 70) {
                    setActiveIndex((activeIndex - 1 + safeImages.length) % safeImages.length);
                  } else if (info.offset.x < -70) {
                    setActiveIndex((activeIndex + 1) % safeImages.length);
                  }
                }}
                className="relative h-full w-full"
              >
                <Image
                  src={safeImages[activeIndex]}
                  alt={interpolate(positionTemplate, {
                    current: activeIndex + 1,
                    total: safeImages.length,
                  })}
                  fill
                  priority
                  unoptimized
                  sizes="100vw"
                  draggable={false}
                  className="object-contain"
                />
              </motion.div>
            </AnimatePresence>

            {safeImages.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((activeIndex - 1 + safeImages.length) % safeImages.length)
                  }
                  aria-label={previousLabel}
                  title={previousLabel}
                  className="absolute top-1/2 left-1 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/8 text-white transition-colors outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white sm:left-3"
                >
                  <ChevronLeft aria-hidden="true" className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIndex((activeIndex + 1) % safeImages.length)}
                  aria-label={nextLabel}
                  title={nextLabel}
                  className="absolute top-1/2 right-1 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/8 text-white transition-colors outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white sm:right-3"
                >
                  <ChevronRight aria-hidden="true" className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>

          <div className="flex min-h-16 items-center justify-center px-4">
            {safeImages.length > 1 ? (
              <div className="flex gap-2" aria-hidden="true">
                {safeImages.map((image, index) => (
                  <span
                    key={image}
                    className={cn(
                      "h-1.5 rounded-full transition-[width,background-color]",
                      index === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/35"
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <div
        className={cn(
          "border-border/80 bg-secondary/70 grid overflow-hidden rounded-[8px] border",
          safeImages.length === 1 && "aspect-[4/3]",
          safeImages.length === 2 && "aspect-[16/10] grid-cols-2",
          safeImages.length === 3 && "aspect-[16/11] grid-cols-2 grid-rows-2",
          safeImages.length === 4 && "aspect-[4/3] grid-cols-2 grid-rows-2"
        )}
      >
        {safeImages.map((image, index) => (
          <button
            key={image}
            type="button"
            onClick={(event) => openImage(index, event.currentTarget)}
            aria-label={interpolate(positionTemplate, {
              current: index + 1,
              total: safeImages.length,
            })}
            className={cn(
              "group focus-visible:ring-primary relative min-h-0 min-w-0 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset",
              index > 0 && "border-background/70 border-l",
              safeImages.length >= 3 && index >= 2 && "border-background/70 border-t",
              safeImages.length === 3 && index === 0 && "row-span-2 border-l-0",
              safeImages.length === 3 && index === 1 && "border-t-0"
            )}
          >
            <Image
              src={image}
              alt={interpolate(positionTemplate, {
                current: index + 1,
                total: safeImages.length,
              })}
              fill
              unoptimized
              sizes={
                safeImages.length === 1
                  ? "(max-width: 768px) 100vw, 680px"
                  : "(max-width: 768px) 50vw, 340px"
              }
              className={cn(
                "transition-transform duration-500 ease-[var(--ease-apple)] group-hover:scale-[1.015]",
                safeImages.length === 1 ? "object-contain" : "object-cover"
              )}
            />
            {index === safeImages.length - 1 && safeImages.length > 1 ? (
              <span className="absolute right-2 bottom-2 inline-flex items-center gap-1.5 rounded-md bg-black/65 px-2 py-1 font-mono text-[0.65rem] text-white backdrop-blur-sm">
                <Images aria-hidden="true" className="h-3 w-3" />
                {interpolate(countTemplate, { count: safeImages.length })}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {isMounted ? createPortal(gallery, document.body) : null}
    </>
  );
}
