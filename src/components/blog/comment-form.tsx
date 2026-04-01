"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  submitCommentAction,
  type SubmitCommentActionState,
} from "@/actions/comments";
import { useLocaleContext } from "@/components/i18n/locale-provider";

type CommentFormProps = {
  postId: number;
  postSlug: string;
};

export function CommentForm({ postId, postSlug }: CommentFormProps) {
  const { dictionary } = useLocaleContext();
  const formDictionary = dictionary.public.post.comments.form;
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

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-4 rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-5"
    >
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="postSlug" value={postSlug} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">
            {formDictionary.nicknameLabel}
          </span>
          <input
            type="text"
            name="nickname"
            required
            maxLength={60}
            autoComplete="name"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {state.errors.nickname ? (
            <p className="text-xs text-destructive">{state.errors.nickname}</p>
          ) : null}
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium text-foreground">
            {formDictionary.emailLabel}
          </span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {state.errors.email ? (
            <p className="text-xs text-destructive">{state.errors.email}</p>
          ) : null}
        </label>
      </div>

      <label className="space-y-2 text-sm">
        <span className="font-medium text-foreground">{formDictionary.bodyLabel}</span>
        <textarea
          name="body"
          required
          rows={5}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {state.errors.body ? (
          <p className="text-xs text-destructive">{state.errors.body}</p>
        ) : null}
      </label>

      {state.message ? (
        <p
          className={
            state.status === "success"
              ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-200"
              : "rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending
          ? formDictionary.submittingButton
          : formDictionary.submitButton}
      </button>
    </form>
  );
}
