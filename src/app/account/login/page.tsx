import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmailAuthForm } from "@/components/account/email-auth-form";
import { FadeIn } from "@/components/ui/animations";
import { getAccountCopy } from "@/lib/account-copy";
import { getAdminSession } from "@/lib/admin-session";
import { getRequestI18n } from "@/lib/i18n/server";
import { getSafeReturnPath } from "@/lib/request-security";
import { buildLocalizedMetadataFields } from "@/lib/seo";
import { getCurrentUser } from "@/lib/user-auth";

type AccountLoginPageProps = {
  searchParams?: Promise<{ next?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getRequestI18n();
  const pageCopy = getAccountCopy(locale).login;
  return {
    ...buildLocalizedMetadataFields(locale, {
      title: pageCopy.metadataTitle,
      description: pageCopy.metadataDescription,
      path: "/account/login",
    }),
    robots: { index: false, follow: false },
  };
}

export default async function AccountLoginPage({ searchParams }: AccountLoginPageProps) {
  const { locale } = await getRequestI18n();
  const pageCopy = getAccountCopy(locale).login;
  const returnTo = getSafeReturnPath((await searchParams)?.next, "/daily");
  const user = await getCurrentUser();
  if (user) {
    if (!returnTo.startsWith("/admin")) {
      redirect(returnTo);
    }

    if (user.role !== "admin") {
      redirect("/account");
    }

    const adminSession = await getAdminSession();
    if (adminSession) {
      redirect(returnTo);
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-4.5rem)] w-full max-w-[64rem] items-center gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.72fr)] lg:gap-20">
      <FadeIn className="max-w-xl">
        <p className="text-primary font-mono text-[0.68rem] font-medium uppercase">
          {pageCopy.eyebrow}
        </p>
        <h1 className="text-foreground mt-5 text-4xl leading-[1.1] font-semibold sm:text-5xl">
          {pageCopy.title}
        </h1>
        <p className="text-muted mt-5 max-w-lg text-base leading-8">{pageCopy.description}</p>
        <div className="border-border/70 mt-10 grid grid-cols-3 border-y py-5">
          {["EMAIL", "VERIFY", "READ"].map((label, index) => (
            <div key={label} className={index > 0 ? "border-border/70 border-l pl-4" : ""}>
              <span className="text-muted font-mono text-[0.62rem]">0{index + 1}</span>
              <p className="text-foreground mt-1 font-mono text-xs font-medium">{label}</p>
            </div>
          ))}
        </div>
      </FadeIn>

      <FadeIn className="border-border/70 lg:border-l lg:py-8 lg:pl-12">
        <EmailAuthForm returnTo={returnTo} />
      </FadeIn>
    </div>
  );
}
