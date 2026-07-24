"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, LogOut, Save } from "lucide-react";
import { AdminAccessLink } from "@/components/account/admin-access-link";
import { useLocaleContext } from "@/components/i18n/locale-provider";
import { getAccountCopy } from "@/lib/account-copy";

type AccountSettingsFormProps = {
  user: {
    email: string;
    displayName: string;
    createdAt: string;
    role: "reader" | "admin";
  };
};

export function AccountSettingsForm({ user }: AccountSettingsFormProps) {
  const router = useRouter();
  const { locale } = useLocaleContext();
  const copy = getAccountCopy(locale).account;
  const [displayName, setDisplayName] = useState(user.displayName);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      if (!response.ok) {
        setError(copy.invalidName);
        return;
      }
      setMessage(copy.savedMessage);
      router.refresh();
    } catch {
      setError(copy.invalidName);
    } finally {
      setIsSaving(false);
    }
  }

  async function logout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  const memberSince = new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(user.createdAt));

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-16">
      <form onSubmit={saveProfile} className="space-y-6">
        <label className="block space-y-2">
          <span className="text-foreground text-sm font-medium">{copy.displayNameLabel}</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={40}
            autoComplete="nickname"
            className="border-border bg-background text-foreground focus:border-primary focus:ring-primary/15 h-11 w-full rounded-md border px-3 text-sm transition outline-none focus:ring-4"
          />
        </label>

        <div className="border-border/70 border-y py-4">
          <p className="text-muted text-xs">{copy.emailLabel}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <p className="text-foreground text-sm font-medium break-all">{user.email}</p>
            <span className="text-primary inline-flex items-center gap-1 text-xs">
              <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
              {copy.verifiedLabel}
            </span>
          </div>
        </div>

        {message ? (
          <p className="border-primary/20 bg-primary/8 text-primary rounded-md border px-3 py-2 text-sm">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="border-destructive/25 bg-destructive/8 text-destructive rounded-md border px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSaving || !displayName.trim()}
          className="bg-primary text-primary-foreground inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition hover:opacity-90 disabled:opacity-55"
        >
          {isSaving ? (
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="h-4 w-4" />
          )}
          {isSaving ? copy.savingButton : copy.saveButton}
        </button>
      </form>

      <aside className="border-border/70 space-y-6 border-t pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
        <AdminAccessLink role={user.role} label={copy.adminAction} />
        <div>
          <p className="text-muted text-xs">{copy.memberSinceLabel}</p>
          <p className="text-foreground mt-1 text-sm font-medium">{memberSince}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          disabled={isLoggingOut}
          className="text-muted hover:text-destructive inline-flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-55"
        >
          {isLoggingOut ? (
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut aria-hidden="true" className="h-4 w-4" />
          )}
          {copy.logoutButton}
        </button>
      </aside>
    </div>
  );
}
