"use client";

import { useActionState } from "react";
import { useLocaleContext } from "@/components/i18n/locale-provider";
import type { WereadSyncActionState } from "@/actions/reading";

type WereadSyncFormProps = {
  action: (state: WereadSyncActionState) => Promise<WereadSyncActionState>;
};

const INITIAL_STATE: WereadSyncActionState = {
  error: null,
  success: null,
};

export function WereadSyncForm({ action }: WereadSyncFormProps) {
  const { dictionary } = useLocaleContext();
  const booksDictionary = dictionary.admin.books;
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight">
            {booksDictionary.sync.heading}
          </h2>
          <p className="text-sm text-muted">{booksDictionary.sync.description}</p>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending
            ? booksDictionary.sync.syncingButton
            : booksDictionary.sync.syncButton}
        </button>
      </div>

      {state.error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
