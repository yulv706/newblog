"use client";

import { useActionState, useEffect, useState } from "react";
import { renderMarkdownToHtml } from "@/lib/markdown";
import type { AboutEditorActionState } from "@/actions/about";

type AboutEditorFormProps = {
  initialContent: string;
  action: (
    state: AboutEditorActionState,
    formData: FormData
  ) => Promise<AboutEditorActionState>;
};

const INITIAL_ACTION_STATE: AboutEditorActionState = {
  error: null,
  success: null,
};

export function AboutEditorForm({ initialContent, action }: AboutEditorFormProps) {
  const [state, formAction, isPending] = useActionState(action, INITIAL_ACTION_STATE);
  const [content, setContent] = useState(initialContent);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    async function loadPreview() {
      try {
        const html = await renderMarkdownToHtml(content);
        if (!disposed) {
          setPreviewHtml(html);
          setPreviewError(null);
        }
      } catch {
        if (!disposed) {
          setPreviewError("Unable to render markdown preview.");
        }
      }
    }

    loadPreview();

    return () => {
      disposed = true;
    };
  }, [content]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">About Page</h1>
        <p className="text-sm text-muted">
          Edit your public About page content using markdown.
        </p>
      </header>

      <form action={formAction} className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block space-y-2 text-sm">
            <span className="font-medium text-foreground">Content (Markdown)</span>
            <textarea
              name="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={18}
              className="min-h-80 w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <section className="space-y-2 rounded-xl border border-border bg-background p-4">
            <h2 className="text-sm font-medium text-foreground">Preview</h2>
            {previewError ? (
              <p className="text-sm text-destructive">{previewError}</p>
            ) : (
              <article
                className="prose max-w-none prose-neutral dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )}
          </section>
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

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Saving..." : "Save about content"}
        </button>
      </form>
    </div>
  );
}
