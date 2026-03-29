"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";
import { NAV_LINKS } from "./nav-links";

function SearchIcon() {
  return (
    <Link
      href="/search"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full",
        "text-muted transition-colors duration-[var(--duration-fast)]",
        "hover:bg-secondary hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
      aria-label="Search"
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
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 w-full",
        "border-b border-border/50 bg-background/80 backdrop-blur-xl",
        "transition-colors duration-[var(--duration-normal)]"
      )}
    >
      <div className="mx-auto flex h-16 max-w-[var(--content-wide-max-width)] items-center justify-between px-[var(--spacing-page)]">
        {/* Logo / Site title */}
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground transition-opacity duration-[var(--duration-fast)] hover:opacity-70"
        >
          Tech Blog
        </Link>

        {/* Desktop navigation */}
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Main navigation"
        >
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm font-medium transition-colors duration-[var(--duration-fast)]",
                  isActive
                    ? "text-foreground"
                    : "text-muted hover:text-foreground"
                )}
              >
                {link.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right-side actions */}
        <div className="flex items-center gap-1">
          <SearchIcon />
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
