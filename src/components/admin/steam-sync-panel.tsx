"use client";

import { RefreshCw } from "lucide-react";
import { useActionState } from "react";
import type { SteamSyncActionState } from "@/actions/games";
import { useLocaleContext } from "@/components/i18n/locale-provider";
import { getGamesCopy } from "@/lib/games-copy";

type SteamSyncPanelProps = {
  action: (state: SteamSyncActionState) => Promise<SteamSyncActionState>;
  disabled: boolean;
};

const INITIAL_STATE: SteamSyncActionState = {
  error: null,
  success: null,
};

export function SteamSyncPanel({ action, disabled }: SteamSyncPanelProps) {
  const { locale } = useLocaleContext();
  const copy = getGamesCopy(locale).admin.sync;
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);

  return (
    <form action={formAction} className="border-border/70 space-y-4 border-t pt-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h2 className="text-foreground text-base font-semibold">{copy.title}</h2>
          <p className="text-muted max-w-2xl text-sm leading-relaxed">{copy.description}</p>
        </div>
        <button
          type="submit"
          disabled={disabled || isPending}
          className="bg-primary text-primary-foreground focus-visible:ring-primary/40 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} aria-hidden="true" />
          {isPending ? copy.pending : copy.button}
        </button>
      </div>

      {state.error ? (
        <p className="border-destructive/30 bg-destructive/8 text-destructive rounded-lg border px-3 py-2 text-sm">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="border-success/30 bg-success/8 text-foreground rounded-lg border px-3 py-2 text-sm">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
