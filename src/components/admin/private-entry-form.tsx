"use client";

import { useActionState, useEffect, useState } from "react";
import { CalendarDays, Flag, LockKeyhole, Save, Sparkles, Target } from "lucide-react";
import type { PrivateEntryActionState } from "@/actions/private-notes";
import { useLocaleContext } from "@/components/i18n/locale-provider";
import { getPrivateNotesCopy } from "@/lib/private-notes-copy";
import type {
  PrivateEntry,
  PrivateEntryKind,
  PrivateEntryPriority,
  PrivateEntryStatus,
} from "@/lib/private-notes";
import { cn } from "@/lib/utils";

type PrivateEntryFormProps = {
  mode: "create" | "edit";
  initialValues?: Partial<PrivateEntry>;
  action: (
    state: PrivateEntryActionState,
    formData: FormData
  ) => Promise<PrivateEntryActionState>;
};

const INITIAL_STATE: PrivateEntryActionState = {
  status: "idle",
  message: null,
};

export function PrivateEntryForm({ mode, initialValues, action }: PrivateEntryFormProps) {
  const { locale } = useLocaleContext();
  const copy = getPrivateNotesCopy(locale);
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);
  const [kind, setKind] = useState<PrivateEntryKind>(initialValues?.kind ?? "thought");
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [content, setContent] = useState(initialValues?.content ?? "");
  const [priority, setPriority] = useState<PrivateEntryPriority>(
    initialValues?.priority ?? "medium"
  );
  const [progress, setProgress] = useState(initialValues?.progress ?? 0);
  const [targetDate, setTargetDate] = useState(initialValues?.targetDate ?? "");
  const [tags, setTags] = useState(initialValues?.tags?.join(", ") ?? "");
  const [status, setStatus] = useState<PrivateEntryStatus>(initialValues?.status ?? "active");

  useEffect(() => {
    if (mode !== "create" || state.status !== "success") {
      return;
    }

    setTitle("");
    setContent("");
    setKind("thought");
    setPriority("medium");
    setProgress(0);
    setTargetDate("");
    setTags("");
  }, [mode, state.status]);

  const isGoal = kind === "goal";

  return (
    <form action={formAction} className="space-y-5">
      {initialValues?.id ? <input type="hidden" name="entryId" value={initialValues.id} /> : null}

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-primary inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase">
            {mode === "create" ? <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> : <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />}
            {mode === "create" ? copy.captureTitle : copy.privacyLabel}
          </div>
          <p className="text-muted mt-1 text-xs leading-5">
            {mode === "create" ? copy.captureDescription : copy.privacyDescription}
          </p>
        </div>
        {mode === "create" ? (
          <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-[11px] font-medium">
            {copy.privacyLabel}
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="private-title" className="text-foreground text-sm font-semibold">
          {copy.titleLabel}
        </label>
        <input
          id="private-title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          required
          placeholder={copy.titlePlaceholder}
          className="border-border bg-background focus:border-primary focus:ring-primary/15 w-full rounded-xl border px-3.5 py-3 text-sm outline-none transition-[border-color,box-shadow] focus:ring-2"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="private-content" className="text-foreground text-sm font-semibold">
            {copy.contentLabel}
          </label>
          <span className="text-muted font-mono text-[11px] tabular-nums">
            {content.length.toLocaleString(locale)} / 12,000
          </span>
        </div>
        <textarea
          id="private-content"
          name="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={12_000}
          rows={mode === "create" ? 8 : 14}
          required
          placeholder={copy.contentPlaceholder}
          className="border-border bg-background focus:border-primary focus:ring-primary/15 min-h-48 w-full resize-y rounded-xl border px-3.5 py-3 text-sm leading-7 outline-none transition-[border-color,box-shadow] focus:ring-2"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset className="space-y-2">
          <legend className="text-foreground text-sm font-semibold">{copy.kindLabel}</legend>
          <div className="border-border bg-secondary/55 grid grid-cols-2 rounded-xl border p-1">
            {(["thought", "goal"] as const).map((value) => (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name="kind"
                  value={value}
                  checked={kind === value}
                  onChange={() => setKind(value)}
                  className="peer sr-only"
                />
                <span className="text-muted peer-checked:bg-background peer-checked:text-foreground inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-[background-color,color,box-shadow] peer-checked:shadow-xs">
                  {value === "goal" ? <Target aria-hidden="true" className="h-3.5 w-3.5" /> : <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />}
                  {value === "goal" ? copy.goalLabel : copy.thoughtLabel}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="space-y-2 text-sm">
          <span className="text-foreground inline-flex items-center gap-2 font-semibold">
            <Flag aria-hidden="true" className="text-muted h-4 w-4" />
            {copy.priorityLabel}
          </span>
          <select
            name="priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as PrivateEntryPriority)}
            className="border-border bg-background focus:border-primary focus:ring-primary/15 w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-[border-color,box-shadow] focus:ring-2"
          >
            {(["low", "medium", "high"] as const).map((value) => (
              <option key={value} value={value}>
                {copy.priority[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {mode === "edit" ? (
        <label className="space-y-2 text-sm">
          <span className="text-foreground font-semibold">{copy.status.active}</span>
          <select
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as PrivateEntryStatus)}
            className="border-border bg-background focus:border-primary focus:ring-primary/15 w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-[border-color,box-shadow] focus:ring-2"
          >
            {(["active", "completed", "archived"] as const).map((value) => (
              <option key={value} value={value}>
                {copy.status[value]}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="text-foreground inline-flex items-center gap-2 font-semibold">
            <CalendarDays aria-hidden="true" className="text-muted h-4 w-4" />
            {copy.targetDateLabel}
          </span>
          <input
            type="date"
            name="targetDate"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
            className="border-border bg-background focus:border-primary focus:ring-primary/15 w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-[border-color,box-shadow] focus:ring-2"
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="text-foreground font-semibold">{copy.tagsLabel}</span>
          <input
            type="text"
            name="tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder={copy.tagsPlaceholder}
            className="border-border bg-background focus:border-primary focus:ring-primary/15 w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-[border-color,box-shadow] focus:ring-2"
          />
        </label>
      </div>

      {isGoal ? (
        <label className="block space-y-2 text-sm">
          <span className="flex items-center justify-between gap-3">
            <span className="text-foreground inline-flex items-center gap-2 font-semibold">
              <Target aria-hidden="true" className="text-muted h-4 w-4" />
              {copy.progressLabel}
            </span>
            <span className="text-primary font-mono text-xs tabular-nums">{progress}%</span>
          </span>
          <input
            type="range"
            name="progress"
            min="0"
            max="100"
            step="5"
            value={progress}
            onChange={(event) => setProgress(Number(event.target.value))}
            className="accent-primary w-full"
          />
        </label>
      ) : (
        <input type="hidden" name="progress" value="0" />
      )}

      {state.message ? (
        <p
          role="status"
          className={cn(
            "rounded-xl border px-3 py-2.5 text-sm",
            state.status === "success"
              ? "border-success/25 bg-success/10 text-success"
              : "border-destructive/25 bg-destructive/10 text-destructive"
          )}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || !title.trim() || !content.trim()}
        className="bg-foreground text-background inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium shadow-sm transition-[transform,opacity] hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
      >
        <Save aria-hidden="true" className="h-4 w-4" />
        {isPending ? copy.savingLabel : mode === "create" ? copy.createButton : copy.updateButton}
      </button>
    </form>
  );
}
