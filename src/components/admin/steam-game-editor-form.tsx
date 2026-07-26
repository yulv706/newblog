"use client";

import Link from "next/link";
import { ExternalLink, Save } from "lucide-react";
import { useActionState } from "react";
import type { SteamGameEditorActionState } from "@/actions/games";
import { useLocaleContext } from "@/components/i18n/locale-provider";
import type { SteamGame } from "@/lib/games";
import { getGamesCopy } from "@/lib/games-copy";

type SteamGameEditorFormProps = {
  game: SteamGame;
  action: (
    state: SteamGameEditorActionState,
    formData: FormData
  ) => Promise<SteamGameEditorActionState>;
};

const INITIAL_STATE: SteamGameEditorActionState = {
  error: null,
  success: null,
};

function ToggleField({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="border-border/70 bg-background flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
      <span className="text-foreground text-sm font-medium">{label}</span>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="border-border text-primary focus-visible:ring-primary/35 h-4 w-4 rounded"
      />
    </label>
  );
}

export function SteamGameEditorForm({ game, action }: SteamGameEditorFormProps) {
  const { locale } = useLocaleContext();
  const copy = getGamesCopy(locale);
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-6">
      <div className="border-border/70 bg-secondary relative aspect-[16/6] min-h-48 overflow-hidden rounded-lg border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={game.heroUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,10,15,0.9),rgba(8,10,15,0.2)_75%)]" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="font-mono text-xs text-white/65">APP {game.appId}</p>
          <h1 className="mt-2 max-w-2xl text-2xl leading-tight font-semibold sm:text-3xl">
            {copy.admin.editor.titleTemplate.replace("{name}", game.name)}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/72">
            {copy.admin.editor.description}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.48fr)]">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-foreground text-sm font-medium">
                {copy.admin.editor.statusLabel}
              </span>
              <select
                name="status"
                defaultValue={game.status}
                className="border-border bg-background text-foreground focus:border-primary/45 focus:ring-primary/20 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
              >
                {Object.entries(copy.public.library.status).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-foreground text-sm font-medium">
                {copy.admin.editor.ratingLabel}
              </span>
              <input
                type="number"
                name="personalRating"
                min="1"
                max="10"
                step="1"
                defaultValue={game.personalRating ?? ""}
                className="border-border bg-background text-foreground focus:border-primary/45 focus:ring-primary/20 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
              />
              <span className="text-muted block text-xs">{copy.admin.editor.ratingHint}</span>
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-foreground text-sm font-medium">
              {copy.admin.editor.tagsLabel}
            </span>
            <input
              type="text"
              name="tags"
              defaultValue={game.tags.join(", ")}
              className="border-border bg-background text-foreground focus:border-primary/45 focus:ring-primary/20 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
            />
            <span className="text-muted block text-xs">{copy.admin.editor.tagsHint}</span>
          </label>

          <label className="space-y-2">
            <span className="text-foreground text-sm font-medium">
              {copy.admin.editor.reviewLabel}
            </span>
            <textarea
              name="review"
              defaultValue={game.review ?? ""}
              rows={8}
              maxLength={2000}
              placeholder={copy.admin.editor.reviewPlaceholder}
              className="border-border bg-background text-foreground placeholder:text-muted focus:border-primary/45 focus:ring-primary/20 min-h-44 w-full resize-y rounded-lg border px-3 py-3 text-sm leading-relaxed outline-none focus:ring-2"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-foreground text-sm font-medium">
                {copy.admin.editor.coverLabel}
              </span>
              <input
                type="url"
                name="customCoverUrl"
                defaultValue={
                  game.coverUrl.includes("cdn.akamai.steamstatic.com") ? "" : game.coverUrl
                }
                className="border-border bg-background text-foreground focus:border-primary/45 focus:ring-primary/20 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
              />
            </label>
            <label className="space-y-2">
              <span className="text-foreground text-sm font-medium">
                {copy.admin.editor.heroLabel}
              </span>
              <input
                type="url"
                name="customHeroUrl"
                defaultValue={
                  game.heroUrl.includes("cdn.akamai.steamstatic.com") ? "" : game.heroUrl
                }
                className="border-border bg-background text-foreground focus:border-primary/45 focus:ring-primary/20 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2"
              />
            </label>
          </div>
        </div>

        <aside className="space-y-3">
          <ToggleField
            name="isVisible"
            label={copy.admin.editor.visibleLabel}
            defaultChecked={game.isVisible}
          />
          <ToggleField
            name="isFavorite"
            label={copy.admin.editor.favoriteLabel}
            defaultChecked={game.isFavorite}
          />
          <ToggleField
            name="isFeatured"
            label={copy.admin.editor.featuredLabel}
            defaultChecked={game.isFeatured}
          />

          <Link
            href={game.storeUrl}
            target="_blank"
            rel="noreferrer"
            className="border-border text-foreground hover:bg-secondary flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 text-sm font-medium transition"
          >
            {copy.public.detail.openSteamLabel}
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        </aside>
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

      <div className="border-border/70 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
        <Link
          href="/admin/games"
          className="border-border text-foreground hover:bg-secondary inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-medium transition"
        >
          {copy.admin.editor.cancel}
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary text-primary-foreground inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition active:scale-[0.98] disabled:opacity-55"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {isPending ? copy.admin.editor.saving : copy.admin.editor.save}
        </button>
      </div>
    </form>
  );
}
