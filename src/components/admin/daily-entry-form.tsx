"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { ImagePlus, MapPin, Pin, Send, Trash2, X } from "lucide-react";
import type { DailyFormActionState } from "@/actions/daily";
import { useLocaleContext } from "@/components/i18n/locale-provider";
import {
  DAILY_CONTENT_MAX_LENGTH,
  DAILY_IMAGES_MAX_COUNT,
  type DailyEntryStatus,
} from "@/lib/daily-shared";
import { getDailyCopy } from "@/lib/daily-copy";
import { cn } from "@/lib/utils";

type DailyEntryFormValues = {
  content: string;
  location: string;
  status: DailyEntryStatus;
  isPinned: boolean;
  occurredAt: string;
  images: string[];
};

type DailyEntryFormProps = {
  mode: "create" | "edit";
  initialValues: DailyEntryFormValues;
  entryId?: number;
  action: (state: DailyFormActionState, formData: FormData) => Promise<DailyFormActionState>;
};

const INITIAL_STATE: DailyFormActionState = {
  status: "idle",
  message: null,
};

function toLocalDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function DailyEntryForm({ mode, initialValues, entryId, action }: DailyEntryFormProps) {
  const { locale } = useLocaleContext();
  const copy = getDailyCopy(locale).admin;
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);
  const [content, setContent] = useState(initialValues.content);
  const [location, setLocation] = useState(initialValues.location);
  const [status, setStatus] = useState<DailyEntryStatus>(initialValues.status);
  const [isPinned, setIsPinned] = useState(initialValues.isPinned);
  const [occurredAt, setOccurredAt] = useState("");
  const [timezoneOffset, setTimezoneOffset] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [previews, setPreviews] = useState<Array<{ file: File; url: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOccurredAt(toLocalDateTime(initialValues.occurredAt));
    setTimezoneOffset(new Date().getTimezoneOffset());
  }, [initialValues.occurredAt]);

  useEffect(() => {
    if (mode !== "create" || state.status !== "success") {
      return;
    }

    setContent("");
    setLocation("");
    setStatus("published");
    setIsPinned(false);
    setOccurredAt(toLocalDateTime(new Date().toISOString()));
    setSelectedFiles([]);
    setRemovedImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [mode, state]);

  const retainedImageCount = initialValues.images.length - removedImages.length;
  const availableImageSlots = Math.max(0, DAILY_IMAGES_MAX_COUNT - retainedImageCount);
  useEffect(() => {
    const nextPreviews = selectedFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviews(nextPreviews);

    return () => {
      for (const preview of nextPreviews) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [selectedFiles]);

  function clearSelectedFiles() {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function toggleRemovedImage(image: string) {
    setRemovedImages((current) =>
      current.includes(image) ? current.filter((item) => item !== image) : [...current, image]
    );
  }

  const submitLabel =
    mode === "edit"
      ? copy.saveButton
      : status === "published"
        ? copy.createButton
        : copy.saveDraftButton;

  return (
    <form action={formAction} className="space-y-6">
      {entryId ? <input type="hidden" name="entryId" value={entryId} /> : null}
      <input type="hidden" name="timezoneOffset" value={timezoneOffset} />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="daily-content" className="text-foreground text-sm font-semibold">
            {copy.contentLabel}
          </label>
          <span
            className={cn(
              "font-mono text-xs tabular-nums",
              content.length > DAILY_CONTENT_MAX_LENGTH ? "text-destructive" : "text-muted"
            )}
          >
            {copy.contentCountTemplate
              .replace("{current}", String(content.length))
              .replace("{max}", String(DAILY_CONTENT_MAX_LENGTH))}
          </span>
        </div>
        <textarea
          id="daily-content"
          name="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={7}
          required
          maxLength={DAILY_CONTENT_MAX_LENGTH}
          placeholder={copy.contentPlaceholder}
          className="border-border bg-background focus:border-primary focus:ring-primary/15 min-h-44 w-full resize-y rounded-lg border px-4 py-3 text-base leading-7 transition-[border-color,box-shadow] outline-none focus:ring-2"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="text-foreground inline-flex items-center gap-2 font-medium">
            <MapPin aria-hidden="true" className="text-muted h-4 w-4" />
            {copy.locationLabel}
          </span>
          <input
            type="text"
            name="location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            maxLength={80}
            placeholder={copy.locationPlaceholder}
            className="border-border bg-background focus:border-primary focus:ring-primary/15 w-full rounded-lg border px-3 py-2.5 transition-[border-color,box-shadow] outline-none focus:ring-2"
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="text-foreground font-medium">{copy.occurredAtLabel}</span>
          <input
            type="datetime-local"
            name="occurredAt"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            required
            className="border-border bg-background focus:border-primary focus:ring-primary/15 w-full rounded-lg border px-3 py-2.5 transition-[border-color,box-shadow] outline-none focus:ring-2"
          />
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-foreground text-sm font-medium">{copy.imagesLabel}</legend>
        <p className="text-muted text-xs leading-5">{copy.imagesDescription}</p>

        {initialValues.images.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {initialValues.images.map((image, index) => {
              const isRemoved = removedImages.includes(image);
              return (
                <label
                  key={image}
                  className={cn(
                    "group bg-secondary relative aspect-square cursor-pointer overflow-hidden rounded-lg border",
                    isRemoved ? "border-destructive/50 opacity-45" : "border-border"
                  )}
                >
                  <Image
                    src={image}
                    alt={copy.imageAltTemplate.replace("{index}", String(index + 1))}
                    fill
                    sizes="160px"
                    className="object-cover"
                  />
                  <input
                    type="checkbox"
                    name="removeImage"
                    value={image}
                    checked={isRemoved}
                    onChange={() => toggleRemovedImage(image)}
                    className="sr-only"
                  />
                  <span className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white shadow-sm">
                    {isRemoved ? (
                      <X aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    )}
                  </span>
                  <span className="sr-only">{copy.removeExistingImageLabel}</span>
                </label>
              );
            })}
          </div>
        ) : null}

        {previews.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {previews.map((preview, index) => (
              <div
                key={`${preview.file.name}-${preview.file.lastModified}`}
                className="border-border bg-secondary relative aspect-square overflow-hidden rounded-lg border"
              >
                {/* Object URLs cannot be optimized by next/image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.url}
                  alt={copy.imageAltTemplate.replace("{index}", String(index + 1))}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <label
            className={cn(
              "border-border hover:bg-secondary inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors",
              availableImageSlots === 0 && "pointer-events-none opacity-50"
            )}
          >
            <ImagePlus aria-hidden="true" className="h-4 w-4" />
            {copy.chooseImagesLabel}
            <input
              ref={fileInputRef}
              type="file"
              name="images"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              disabled={availableImageSlots === 0}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []).slice(0, availableImageSlots);
                setSelectedFiles(files);
              }}
              className="sr-only"
            />
          </label>
          {selectedFiles.length > 0 ? (
            <button
              type="button"
              onClick={clearSelectedFiles}
              className="text-muted hover:bg-secondary hover:text-foreground inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
            >
              <X aria-hidden="true" className="h-4 w-4" />
              {copy.clearImagesLabel}
            </button>
          ) : null}
        </div>
      </fieldset>

      <div className="border-border/70 grid gap-5 border-t pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <fieldset className="space-y-2">
          <legend className="text-foreground text-sm font-medium">{copy.statusLabel}</legend>
          <div className="border-border bg-secondary/55 inline-flex rounded-lg border p-1">
            {(["draft", "published"] as const).map((value) => (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value={value}
                  checked={status === value}
                  onChange={() => setStatus(value)}
                  className="peer sr-only"
                />
                <span className="text-muted peer-checked:bg-background peer-checked:text-foreground inline-flex min-h-9 items-center rounded-md px-4 py-2 text-sm transition-[background-color,color,box-shadow] peer-checked:shadow-xs">
                  {value === "published" ? copy.publishedLabel : copy.draftLabel}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="text-foreground flex min-h-10 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="isPinned"
            checked={isPinned}
            onChange={(event) => setIsPinned(event.target.checked)}
            className="border-border accent-primary h-4 w-4 rounded"
          />
          <Pin aria-hidden="true" className="text-muted h-4 w-4" />
          {copy.pinnedLabel}
        </label>
      </div>

      {state.message ? (
        <p
          role="status"
          className={cn(
            "rounded-lg border px-3 py-2.5 text-sm",
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
        disabled={isPending || !content.trim() || content.length > DAILY_CONTENT_MAX_LENGTH}
        className="bg-foreground text-background inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-[transform,opacity] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
      >
        <Send aria-hidden="true" className="h-4 w-4" />
        {isPending ? copy.savingLabel : submitLabel}
      </button>
    </form>
  );
}
