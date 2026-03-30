"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "./nav-links";

const DRAWER_TRANSITION_MS = 300;

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDrawerMounted, setIsDrawerMounted] = useState(false);
  const pathname = usePathname();

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Close on route change
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Mount drawer only while active/opening/closing to avoid off-canvas width contribution
  useEffect(() => {
    if (isOpen) {
      setIsDrawerMounted(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && isDrawerMounted) {
      const timer = window.setTimeout(() => {
        setIsDrawerMounted(false);
      }, DRAWER_TRANSITION_MS);

      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [isOpen, isDrawerMounted]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full md:hidden",
          "text-muted transition-colors duration-[var(--duration-fast)]",
          "hover:bg-secondary hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        type="button"
      >
        {isOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        )}
      </button>

      {/* Backdrop */}
      {isDrawerMounted && (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-[var(--duration-normal)] md:hidden",
            isOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Slide-out drawer */}
      {isDrawerMounted && (
        <div
          className={cn(
            "fixed right-0 top-0 z-50 h-full w-[min(20rem,100vw)] max-w-full overflow-y-auto border-l border-border bg-background shadow-xl md:hidden",
            "transition-[transform,opacity] duration-[var(--duration-normal)] ease-[var(--ease-apple)]",
            isOpen
              ? "translate-x-0 opacity-100"
              : "pointer-events-none translate-x-full opacity-0"
          )}
          role="dialog"
          aria-modal={isOpen}
          aria-hidden={!isOpen}
          aria-label="Navigation menu"
        >
          {/* Close button inside drawer */}
          <div className="flex h-16 items-center justify-end px-4">
            <button
              onClick={close}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full",
                "text-muted transition-colors duration-[var(--duration-fast)]",
                "hover:bg-secondary hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              )}
              aria-label="Close menu"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex flex-col px-4 py-2" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  className={cn(
                    "rounded-lg px-4 py-3 text-base font-medium transition-colors duration-[var(--duration-fast)]",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted hover:bg-secondary hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
