"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { LogIn, UserRound } from "lucide-react";
import {
  submitCommentAction,
  type SubmitCommentActionState,
} from "@/actions/comments";
import { useLocaleContext } from "@/components/i18n/locale-provider";
import { getAccountCopy } from "@/lib/account-copy";

type CommentFormProps = {
  postId: number;
  postSlug: string;
  viewer: {
    displayName: string;
    email: string;
  } | null;
};

function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function CommentForm({ postId, postSlug, viewer }: CommentFormProps) {
  const { locale } = useLocaleContext();
  const accountCopy = getAccountCopy(locale).comments;
  const initialState: SubmitCommentActionState = {
    status: "idle",
    message: null,
    errors: {},
  };

  const [state, formAction, isPending] = useActionState(
    submitCommentAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  if (!viewer) {
    return (
      <div className="border-border/70 bg-card/45 rounded-lg border p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary grid h-10 w-10 shrink-0 place-items-center rounded-full">
            <UserRound aria-hidden="true" className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-foreground font-semibold">
              {accountCopy.signInTitle}
            </h3>
            <p className="text-muted mt-1 text-sm leading-6">
              {accountCopy.signInDescription}
            </p>
            <Link
              href={`/account/login?next=${encodeURIComponent(`/blog/${postSlug}#comments`)}`}
              className="bg-primary text-primary-foreground mt-4 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium transition hover:opacity-90"
            >
              <LogIn aria-hidden="true" className="h-4 w-4" />
              {accountCopy.signInButton}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-4 rounded-lg border border-border/70 bg-card/55 p-4 sm:p-5"
    >
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="postSlug" value={postSlug} />

      <div className="border-border/70 flex items-center gap-3 border-b pb-4">
        <div className="bg-primary/10 text-primary grid h-9 w-9 place-items-center rounded-full">
          <UserRound aria-hidden="true" className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-foreground truncate text-sm font-medium">
            {interpolate(accountCopy.signedInTemplate, {
              name: viewer.displayName,
            })}
          </p>
          <p className="text-muted truncate text-xs">{viewer.email}</p>
        </div>
      </div>

      <label className="space-y-2 text-sm">
        <span className="font-medium text-foreground">{accountCopy.bodyLabel}</span>
        <textarea
          name="body"
          required
          rows={5}
          className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {state.errors.body ? (
          <p className="text-xs text-destructive">{state.errors.body}</p>
        ) : null}
      </label>

      {state.message ? (
        <p
          className={
            state.status === "success"
              ? "rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-200"
              : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending
          ? accountCopy.submittingButton
          : accountCopy.submitButton}
      </button>
    </form>
  );
}
