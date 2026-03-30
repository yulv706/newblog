"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createSlug } from "@/lib/slug";
import { renderMarkdownToHtml } from "@/lib/markdown";
import type { PostFormActionState } from "@/actions/posts";

type CategoryOption = {
  id: number;
  name: string;
};

type PostEditorInitialValues = {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  categoryId: string;
  tags: string;
  coverImage: string;
  status: "draft" | "published";
};

type PostEditorFormProps = {
  mode: "create" | "edit";
  categories: CategoryOption[];
  initialValues: PostEditorInitialValues;
  action: (
    state: PostFormActionState,
    formData: FormData
  ) => Promise<PostFormActionState>;
  postId?: number;
};

const INITIAL_ACTION_STATE: PostFormActionState = {
  error: null,
};

export function PostEditorForm({
  mode,
  categories,
  initialValues,
  action,
  postId,
}: PostEditorFormProps) {
  const [state, formAction, isPending] = useActionState(action, INITIAL_ACTION_STATE);
  const [title, setTitle] = useState(initialValues.title);
  const [slug, setSlug] = useState(initialValues.slug);
  const [content, setContent] = useState(initialValues.content);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(mode === "edit");
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

  const formTitle = useMemo(
    () => (mode === "create" ? "New Post" : "Edit Post"),
    [mode]
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{formTitle}</h1>
        <p className="text-sm text-muted">
          {mode === "create"
            ? "Write and preview your markdown before publishing."
            : "Update this post and save your changes."}
        </p>
      </header>

      <form action={formAction} className="space-y-5">
        {postId ? <input type="hidden" name="postId" value={postId} /> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Title</span>
            <input
              name="title"
              value={title}
              onChange={(event) => {
                const nextTitle = event.target.value;
                setTitle(nextTitle);
                if (!slugManuallyEdited) {
                  setSlug(createSlug(nextTitle));
                }
              }}
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Slug</span>
            <input
              name="slug"
              value={slug}
              onChange={(event) => {
                setSlug(event.target.value);
                setSlugManuallyEdited(true);
              }}
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Category</span>
            <select
              name="categoryId"
              defaultValue={initialValues.categoryId}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Status</span>
            <select
              name="status"
              defaultValue={initialValues.status}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Tags</span>
            <input
              name="tags"
              defaultValue={initialValues.tags}
              placeholder="react, typescript, nextjs"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Cover Image URL</span>
            <input
              name="coverImage"
              type="url"
              defaultValue={initialValues.coverImage}
              placeholder="https://example.com/cover.jpg"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="font-medium text-foreground">Excerpt</span>
          <textarea
            name="excerpt"
            defaultValue={initialValues.excerpt}
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block space-y-2 text-sm">
            <span className="font-medium text-foreground">Content (Markdown)</span>
            <textarea
              name="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={18}
              required
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

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
              ? "Create post"
              : "Save changes"}
        </button>
      </form>
    </div>
  );
}
