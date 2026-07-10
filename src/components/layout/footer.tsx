import Link from "next/link";
import type { AppDictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "./nav-links";

type FooterDictionary = AppDictionary["shell"];

type FooterProps = {
  dictionary: FooterDictionary;
};

export function Footer({ dictionary }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const copyright = dictionary.footer.copyrightTemplate.replace(
    "{year}",
    String(currentYear)
  );

  return (
    <footer className="w-full border-t border-border/50 bg-card/35">
      <div
        className={cn(
          "mx-auto grid max-w-[var(--content-wide-max-width)] gap-8 px-[var(--spacing-page)] py-10",
          "sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
        )}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_0_5px_color-mix(in_oklab,var(--color-primary)_12%,transparent)]" />
            <p className="font-semibold tracking-tight text-foreground">
              {dictionary.siteTitle}
            </p>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-muted">
            {dictionary.footer.tagline}
          </p>
          <p className="text-xs text-muted/75">{copyright}</p>
        </div>

        <nav
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
          aria-label={dictionary.footer.socialLinksAriaLabel}
        >
          {NAV_LINKS.filter((link) => link.href !== "/").map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              {dictionary.navigation.links[link.key]}
            </Link>
          ))}
          <Link
            href="/feed.xml"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            RSS
          </Link>
        </nav>
      </div>
    </footer>
  );
}
