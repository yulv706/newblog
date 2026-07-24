import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountSettingsForm } from "@/components/account/account-settings-form";
import { FadeIn } from "@/components/ui/animations";
import { getAccountCopy } from "@/lib/account-copy";
import { getRequestI18n } from "@/lib/i18n/server";
import { buildLocalizedMetadataFields } from "@/lib/seo";
import { getCurrentUser } from "@/lib/user-auth";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getRequestI18n();
  const pageCopy = getAccountCopy(locale).account;
  return {
    ...buildLocalizedMetadataFields(locale, {
      title: pageCopy.metadataTitle,
      description: pageCopy.description,
      path: "/account",
    }),
    robots: { index: false, follow: false },
  };
}

export default async function AccountPage() {
  const { locale } = await getRequestI18n();
  const pageCopy = getAccountCopy(locale).account;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/account/login?next=/account");
  }

  return (
    <div className="mx-auto w-full max-w-[52rem] py-12 sm:py-16">
      <FadeIn>
        <div className="border-border/70 border-b pb-9">
          <p className="text-primary font-mono text-[0.68rem] font-medium uppercase">
            {pageCopy.eyebrow}
          </p>
          <h1 className="text-foreground mt-4 text-4xl font-semibold">
            {pageCopy.title}
          </h1>
          <p className="text-muted mt-3 max-w-xl text-base leading-7">
            {pageCopy.description}
          </p>
        </div>
        <div className="pt-9">
          <AccountSettingsForm user={user} />
        </div>
      </FadeIn>
    </div>
  );
}
