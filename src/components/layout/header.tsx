"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole, UserRound } from "lucide-react";
import { useLocaleContext } from "@/components/i18n/locale-provider";
import { getAccountCopy } from "@/lib/account-copy";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";
import { NAV_LINKS } from "./nav-links";

function SearchIcon({ ariaLabel }: { ariaLabel: string }) {
  return (
    <Link
      href="/search"
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full",
        "text-muted transition-colors duration-[var(--duration-fast)]",
        "hover:bg-secondary hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
      aria-label={ariaLabel}
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

function BrandMark() {
  return (
    <span
      className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs transition-transform duration-300 group-hover:-rotate-2"
      aria-hidden="true"
    >
      <span className="absolute inset-y-0 left-[10px] w-px bg-primary/40" />
      <span className="absolute inset-x-2 top-[11px] h-px bg-foreground/20" />
      <span className="absolute inset-x-2 top-[17px] h-px bg-foreground/20" />
      <span className="absolute inset-x-2 top-[23px] h-px bg-foreground/20" />
      <span className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
    </span>
  );
}

type HeaderProps = {
  viewer: {
    displayName: string;
    email: string;
  } | null;
};

export function Header({ viewer }: HeaderProps) {
  const pathname = usePathname();
  const { dictionary, locale } = useLocaleContext();
  const navDictionary = dictionary.shell.navigation;
  const accountCopy = getAccountCopy(locale).header;

  return (
    <header
      className={cn(
        "sticky top-0 z-30 w-full",
        "border-b border-border/50 bg-background/78 shadow-[0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-2xl",
        "transition-colors duration-[var(--duration-normal)]"
      )}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-[var(--content-wide-max-width)] items-center justify-between px-[var(--spacing-page)]">
        {/* Logo / Site title */}
        <Link
          href="/"
          className="group flex items-center gap-3 text-foreground"
        >
          <BrandMark />
          <span className="leading-none">
            <span className="block text-[1.05rem] font-semibold tracking-[-0.03em]">
              {dictionary.shell.siteTitle}
            </span>
            <span className="mt-1 hidden font-mono text-[0.55rem] font-medium tracking-[0.24em] text-muted sm:block">
              READ · WRITE
            </span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav
          className="hidden items-center gap-0.5 rounded-full border border-border/60 bg-secondary/55 p-1 shadow-xs md:flex"
          aria-label={navDictionary.mainAriaLabel}
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
                  "relative rounded-full px-4 py-2 text-sm font-medium transition-[color,background-color,box-shadow] duration-[var(--duration-fast)]",
                  isActive
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted hover:bg-background/55 hover:text-foreground"
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  {navDictionary.links[link.key]}
                  {link.key === "daily" && !viewer ? (
                    <LockKeyhole
                      aria-hidden="true"
                      className="h-3.5 w-3.5 opacity-65"
                    />
                  ) : null}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Right-side actions */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <SearchIcon ariaLabel={navDictionary.searchAriaLabel} />
          <Link
            href={
              viewer
                ? "/account"
                : `/account/login?next=${encodeURIComponent(pathname)}`
            }
            aria-label={
              viewer
                ? `${accountCopy.accountAriaLabel}: ${viewer.displayName}`
                : accountCopy.loginLabel
            }
            title={viewer ? viewer.displayName : accountCopy.loginLabel}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full",
              "transition-colors duration-[var(--duration-fast)]",
              viewer
                ? "bg-primary/10 text-primary"
                : "text-muted hover:bg-secondary hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            <UserRound
              aria-hidden="true"
              className="h-[18px] w-[18px]"
              strokeWidth={1.7}
            />
          </Link>
          <LanguageSwitcher />
          <ThemeToggle />
          <MobileNav viewer={viewer} />
        </div>
      </div>
    </header>
  );
}
