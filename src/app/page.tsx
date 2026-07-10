import type { Metadata } from "next";
import Link from "next/link";
import { HomeCategoryNav } from "@/components/blog/home-category-nav";
import { HomePostCard } from "@/components/blog/home-post-card";
import { FadeIn, StaggeredItem, StaggeredList } from "@/components/ui/animations";
import { getRequestI18n } from "@/lib/i18n/server";
import { getHomepageData } from "@/lib/posts";
import { buildLocalizedMetadataFields } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, dictionary } = await getRequestI18n();
  const homeDictionary = dictionary.public.home;

  return buildLocalizedMetadataFields(locale, {
    title: homeDictionary.title,
    description: homeDictionary.description,
    path: "/",
  });
}

function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
      {diagonal ? (
        <path d="M5 12 12 5m-5.5 0H12v5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M3.5 8.5h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export default async function HomePage() {
  const { locale, dictionary } = await getRequestI18n();
  const homeDictionary = dictionary.public.home;
  const commonDictionary = dictionary.public.common;
  const postDictionary = dictionary.public.post;
  const { featuredPost, latestPosts, totalPosts, categories } = await getHomepageData();
  const exploreSectionNumber = latestPosts.length > 0 ? "03" : "02";
  const explorePaths = [
    {
      href: "/blog",
      number: "01",
      title: homeDictionary.paths.blogTitle,
      description: homeDictionary.paths.blogDescription,
    },
    {
      href: "/books",
      number: "02",
      title: homeDictionary.paths.booksTitle,
      description: homeDictionary.paths.booksDescription,
    },
    {
      href: "/about",
      number: "03",
      title: homeDictionary.paths.aboutTitle,
      description: homeDictionary.paths.aboutDescription,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[var(--content-wide-max-width)] space-y-20 pb-16 pt-6 sm:space-y-28 sm:pb-24 sm:pt-10">
      <section className="home-hero relative isolate overflow-hidden rounded-[2rem] border border-border/55 bg-card/72 px-6 py-10 shadow-[var(--shadow-soft)] sm:px-10 sm:py-14 lg:min-h-[35rem] lg:px-14 lg:py-16">
        <div className="pointer-events-none absolute -left-32 -top-36 h-80 w-80 rounded-full bg-primary/[0.09] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-8 h-72 w-72 rounded-full bg-sky-400/[0.08] blur-3xl dark:bg-sky-300/[0.06]" />

        <FadeIn className="relative grid h-full gap-12 lg:grid-cols-[minmax(0,1.12fr)_minmax(22rem,0.88fr)] lg:items-center lg:gap-10">
          <div className="max-w-3xl space-y-8">
            <div className="space-y-5">
              <p className="inline-flex items-center gap-3 font-mono text-[0.68rem] font-medium tracking-[0.22em] text-primary">
                <span className="h-px w-8 bg-primary/60" aria-hidden="true" />
                {homeDictionary.heroKicker}
              </p>
              <h1 className="max-w-[13ch] text-[clamp(2.8rem,7vw,5.65rem)] font-semibold leading-[1.04] tracking-[-0.065em] text-foreground">
                {homeDictionary.title}
              </h1>
              <p className="max-w-xl text-base leading-[1.9] text-muted sm:text-lg">
                {homeDictionary.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/blog"
                className="group inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                {homeDictionary.primaryAction}
                <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                  <ArrowIcon />
                </span>
              </Link>
              <Link
                href="/books"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background/65 px-5 py-3 text-sm font-medium text-foreground transition-[border-color,background-color,transform] duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/[0.05]"
              >
                {homeDictionary.secondaryAction}
              </Link>
            </div>

            <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-border/60 pt-6">
              <div className="flex items-baseline gap-2">
                <dt className="order-2 text-xs tracking-wide text-muted">{homeDictionary.postCountLabel}</dt>
                <dd className="font-mono text-lg font-medium tabular-nums text-foreground">{String(totalPosts).padStart(2, "0")}</dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="order-2 text-xs tracking-wide text-muted">{homeDictionary.categoryCountLabel}</dt>
                <dd className="font-mono text-lg font-medium tabular-nums text-foreground">{String(categories.length).padStart(2, "0")}</dd>
              </div>
            </dl>
          </div>

          <div className="home-note-stage relative mx-auto hidden min-h-[25rem] w-full max-w-[25rem] lg:block" aria-hidden="true">
            <div className="home-note-orbit absolute inset-[8%] rounded-full border border-primary/15" />
            <div className="home-note-orbit home-note-orbit-delayed absolute inset-[18%] rounded-full border border-dashed border-foreground/10" />
            <div className="home-note-sheet absolute left-1/2 top-1/2 w-[18rem] rounded-[1.25rem] border border-border/70 bg-background/92 p-6 shadow-[var(--shadow-paper)] backdrop-blur">
              <div className="flex items-center justify-between border-b border-border/60 pb-4 font-mono text-[0.58rem] tracking-[0.18em] text-muted">
                <span>VOL. 01</span>
                <span>READ / WRITE</span>
              </div>
              <div className="relative min-h-[12rem] py-6">
                <span className="absolute bottom-0 left-3 top-0 w-px bg-primary/25" />
                <div className="space-y-5 pl-8">
                  <p className="text-4xl font-semibold leading-[1.18] tracking-[-0.08em] text-foreground">
                    读
                    <span className="mx-2 text-primary/45">·</span>
                    写
                  </p>
                  <div className="space-y-2.5">
                    <span className="block h-px w-full bg-border/70" />
                    <span className="block h-px w-5/6 bg-border/70" />
                    <span className="block h-px w-2/3 bg-border/70" />
                  </div>
                  <p className="text-xs leading-relaxed text-muted">把偶然的念头，写成可以重读的日常。</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 font-mono text-[0.56rem] tracking-[0.15em] text-muted">
                <span>THINK SLOWLY</span>
                <span className="h-2 w-2 rounded-full bg-primary" />
              </div>
            </div>
            <span className="home-note-chip absolute right-1 top-[19%] rounded-full border border-border/60 bg-background/85 px-3 py-2 font-mono text-[0.58rem] tracking-[0.16em] text-muted shadow-sm backdrop-blur">
              NOTE / 记
            </span>
            <span className="home-note-chip home-note-chip-delayed absolute bottom-[18%] left-0 rounded-full border border-border/60 bg-background/85 px-3 py-2 font-mono text-[0.58rem] tracking-[0.16em] text-muted shadow-sm backdrop-blur">
              KEEP / 留
            </span>
          </div>
        </FadeIn>
      </section>

      <section className="space-y-7">
        <FadeIn className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="font-mono text-[0.65rem] font-medium tracking-[0.2em] text-primary">01 / SELECTED</p>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">
              {homeDictionary.featuredEyebrow}
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-muted">{homeDictionary.latestDescription}</p>
        </FadeIn>

        <FadeIn>
          {featuredPost ? (
            <HomePostCard
              post={featuredPost}
              featured
              locale={locale}
              ctaLabel={homeDictionary.featuredCta}
              dictionary={{
                noCoverImageLabel: commonDictionary.noCoverImageLabel,
                uncategorizedLabel: commonDictionary.uncategorizedLabel,
                coverImageAltTemplate: postDictionary.coverImageAltTemplate,
                dateFallbackLabel: commonDictionary.dateFallbackLabel,
              }}
            />
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-border bg-card/60 p-10 text-center text-sm text-muted">
              {homeDictionary.featuredEmpty}
            </div>
          )}
        </FadeIn>
      </section>

      {latestPosts.length > 0 ? (
        <section className="space-y-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="font-mono text-[0.65rem] font-medium tracking-[0.2em] text-primary">02 / LATEST</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{homeDictionary.latestHeading}</h2>
              <p className="text-sm text-muted">{homeDictionary.latestDescription}</p>
            </div>
            <Link href="/blog" className="group inline-flex items-center gap-2 text-sm font-medium text-foreground">
              {homeDictionary.latestCta}
              <span className="transition-transform duration-300 group-hover:translate-x-1"><ArrowIcon /></span>
            </Link>
          </div>
          <StaggeredList className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latestPosts.map((post) => (
                <StaggeredItem key={post.id} className="h-full">
                  <HomePostCard
                    post={post}
                    locale={locale}
                    ctaLabel={homeDictionary.featuredCta}
                    dictionary={{
                      noCoverImageLabel: commonDictionary.noCoverImageLabel,
                      uncategorizedLabel: commonDictionary.uncategorizedLabel,
                      coverImageAltTemplate: postDictionary.coverImageAltTemplate,
                      dateFallbackLabel: commonDictionary.dateFallbackLabel,
                    }}
                  />
                </StaggeredItem>
              ))}
          </StaggeredList>
        </section>
      ) : null}

      <section className="space-y-7">
        <FadeIn className="space-y-2">
          <p className="font-mono text-[0.65rem] font-medium tracking-[0.2em] text-primary">{exploreSectionNumber} / EXPLORE</p>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{homeDictionary.exploreHeading}</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted">{homeDictionary.exploreDescription}</p>
        </FadeIn>

        <StaggeredList className="grid gap-4 md:grid-cols-3">
          {explorePaths.map((path) => (
            <StaggeredItem key={path.href} className="h-full">
              <Link
                href={path.href}
                className="group flex h-full min-h-[10rem] flex-col justify-between rounded-[1.5rem] border border-border/60 bg-card/60 p-6 transition-[border-color,background-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:border-primary/25 hover:bg-card hover:shadow-[var(--shadow-soft)] sm:min-h-[11rem] md:min-h-[12rem]"
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[0.62rem] tracking-[0.18em] text-muted">{path.number}</span>
                  <span className="text-muted transition-[color,transform] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary">
                    <ArrowIcon diagonal />
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground">{path.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{path.description}</p>
                </div>
              </Link>
            </StaggeredItem>
          ))}
        </StaggeredList>

        <FadeIn>
          <HomeCategoryNav
            categories={categories}
            dictionary={{
              heading: homeDictionary.categoriesHeading,
              description: homeDictionary.categoriesDescription,
              emptyState: homeDictionary.categoriesEmpty,
            }}
          />
        </FadeIn>
      </section>
    </div>
  );
}
