"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  Mail,
} from "lucide-react";
import { useLocaleContext } from "@/components/i18n/locale-provider";
import { getAccountCopy } from "@/lib/account-copy";

type EmailAuthFormProps = {
  returnTo: string;
};

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function EmailAuthForm({ returnTo }: EmailAuthFormProps) {
  const router = useRouter();
  const { locale } = useLocaleContext();
  const copy = getAccountCopy(locale).login;
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [secondsUntilResend, setSecondsUntilResend] = useState(0);

  useEffect(() => {
    if (secondsUntilResend <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsUntilResend((current) => Math.max(0, current - 1));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [secondsUntilResend]);

  const codeDescription = useMemo(
    () => interpolate(copy.codeDescriptionTemplate, { email }),
    [copy.codeDescriptionTemplate, email]
  );

  async function requestCode() {
    setIsPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        challengeId?: string;
        message?: string;
        retryAfterSeconds?: number;
      };

      if (!response.ok || !payload.ok || !payload.challengeId) {
        setError(payload.message || copy.errors.deliveryUnavailable);
        if (payload.retryAfterSeconds) {
          setSecondsUntilResend(payload.retryAfterSeconds);
        }
        return;
      }

      setChallengeId(payload.challengeId);
      setCode("");
      setStep("code");
      setSecondsUntilResend(60);
    } catch {
      setError(copy.errors.deliveryUnavailable);
    } finally {
      setIsPending(false);
    }
  }

  async function onEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await requestCode();
  }

  async function onCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError(copy.errors.invalidCode);
      return;
    }

    setIsPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, code }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.ok) {
        setError(payload.message || copy.errors.invalidCode);
        return;
      }

      router.replace(returnTo);
      router.refresh();
    } catch {
      setError(copy.errors.invalidRequest);
    } finally {
      setIsPending(false);
    }
  }

  if (step === "code") {
    return (
      <form onSubmit={onCodeSubmit} className="space-y-6" noValidate>
        <div>
          <p className="text-primary font-mono text-[0.68rem] font-medium uppercase">
            02 · VERIFY
          </p>
          <h2 className="text-foreground mt-3 text-2xl font-semibold">
            {copy.codeTitle}
          </h2>
          <p className="text-muted mt-2 text-sm leading-6">{codeDescription}</p>
        </div>

        <label className="block space-y-2">
          <span className="text-foreground text-sm font-medium">
            {copy.codeLabel}
          </span>
          <input
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            aria-invalid={Boolean(error)}
            placeholder={copy.codePlaceholder}
            className="border-border bg-background text-foreground focus:border-primary focus:ring-primary/15 h-14 w-full rounded-md border px-4 font-mono text-2xl tracking-[0.28em] outline-none transition focus:ring-4"
          />
        </label>

        {error ? (
          <p
            role="alert"
            className="border-destructive/25 bg-destructive/8 text-destructive rounded-md border px-3 py-2.5 text-sm"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending || code.length !== 6}
          className="bg-primary text-primary-foreground inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-medium shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isPending ? (
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Check aria-hidden="true" className="h-4 w-4" />
          )}
          {isPending ? copy.verifyingButton : copy.verifyButton}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setChallengeId("");
              setCode("");
              setError("");
            }}
            className="text-muted hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {copy.changeEmailButton}
          </button>
          <button
            type="button"
            disabled={isPending || secondsUntilResend > 0}
            onClick={requestCode}
            className="text-primary disabled:text-muted inline-flex min-h-9 items-center font-medium transition-colors disabled:cursor-not-allowed"
          >
            {secondsUntilResend > 0
              ? interpolate(copy.resendCountdownTemplate, {
                  seconds: secondsUntilResend,
                })
              : copy.resendButton}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onEmailSubmit} className="space-y-5" noValidate>
      <div>
        <p className="text-primary font-mono text-[0.68rem] font-medium uppercase">
          01 · EMAIL
        </p>
        <h2 className="text-foreground mt-3 text-2xl font-semibold">
          {copy.emailLabel}
        </h2>
      </div>

      <label className="block space-y-2">
        <span className="text-foreground text-sm font-medium">{copy.emailLabel}</span>
        <div className="relative">
          <Mail
            aria-hidden="true"
            className="text-muted pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2"
          />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            autoFocus
            placeholder={copy.emailPlaceholder}
            className="border-border bg-background text-foreground focus:border-primary focus:ring-primary/15 h-11 w-full rounded-md border pr-3 pl-10 text-sm outline-none transition focus:ring-4"
          />
        </div>
      </label>

      <label className="block space-y-2">
        <span className="text-foreground text-sm font-medium">
          {copy.displayNameLabel}
        </span>
        <input
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={40}
          autoComplete="nickname"
          placeholder={copy.displayNamePlaceholder}
          className="border-border bg-background text-foreground focus:border-primary focus:ring-primary/15 h-11 w-full rounded-md border px-3 text-sm outline-none transition focus:ring-4"
        />
        <span className="text-muted block text-xs leading-5">
          {copy.displayNameHint}
        </span>
      </label>

      {error ? (
        <p
          role="alert"
          className="border-destructive/25 bg-destructive/8 text-destructive rounded-md border px-3 py-2.5 text-sm"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || !email.trim()}
        className="bg-primary text-primary-foreground inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-medium shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
      >
        {isPending ? (
          <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        )}
        {isPending ? copy.sendingCodeButton : copy.sendCodeButton}
      </button>

      <p className="text-muted text-xs leading-5">{copy.privacyHint}</p>
    </form>
  );
}
