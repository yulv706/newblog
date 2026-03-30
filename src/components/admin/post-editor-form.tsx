"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type DragEvent,
} from "react";
import { createSlug } from "@/lib/slug";
import { renderMarkdownToHtml } from "@/lib/markdown";
import {
  parseMarkdownUploadAction,
  uploadMarkdownImagesAction,
  type PostFormActionState,
} from "@/actions/posts";

type CategoryOption = {
  id: number;
  name: string;
};

type PostEditorInitialValues = {
  title: string;
  slug: string;
  date: string;
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
  const [date, setDate] = useState(initialValues.date);
  const [content, setContent] = useState(initialValues.content);
  const [excerpt, setExcerpt] = useState(initialValues.excerpt);
  const [categoryId, setCategoryId] = useState(initialValues.categoryId);
  const [tags, setTags] = useState(initialValues.tags);
  const [coverImage, setCoverImage] = useState(initialValues.coverImage);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(mode === "edit");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [markdownUploadError, setMarkdownUploadError] = useState<string | null>(null);
  const [markdownUploadNotice, setMarkdownUploadNotice] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [localImageReferences, setLocalImageReferences] = useState<string[]>([]);
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [imageUploadNotice, setImageUploadNotice] = useState<string | null>(null);
  const [isParsingMarkdown, startMarkdownParse] = useTransition();
  const [isUploadingImages, startImageUpload] = useTransition();

  const categoryLookup = useMemo(() => {
    return new Map(categories.map((category) => [category.name.toLowerCase(), category.id]));
  }, [categories]);

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

  function handleMarkdownFile(file: File | null) {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".md")) {
      setMarkdownUploadError("Only .md files are supported.");
      setMarkdownUploadNotice(null);
      return;
    }

    startMarkdownParse(async () => {
      try {
        const source = await file.text();
        const parsed = await parseMarkdownUploadAction(source);

        if (parsed.error) {
          setMarkdownUploadError(parsed.error);
          setMarkdownUploadNotice(null);
          return;
        }

        const nextTitle = parsed.frontmatter.title;
        const categoryName = parsed.frontmatter.category.toLowerCase();
        const matchedCategoryId = categoryLookup.get(categoryName);

        setTitle(nextTitle);
        setSlug(nextTitle ? createSlug(nextTitle) : "");
        setSlugManuallyEdited(false);
        setDate(parsed.frontmatter.date);
        setTags(parsed.frontmatter.tags);
        setExcerpt(parsed.frontmatter.excerpt);
        setCoverImage(parsed.frontmatter.coverImage);
        setCategoryId(matchedCategoryId ? String(matchedCategoryId) : "");
        setContent(parsed.content);
        setLocalImageReferences(parsed.localImageReferences);
        setSelectedImageFiles([]);
        setImageUploadError(null);
        setImageUploadNotice(
          parsed.localImageReferences.length > 0
            ? `Detected ${parsed.localImageReferences.length} local image reference(s).`
            : "No local image references were detected."
        );
        setMarkdownUploadError(null);
        setMarkdownUploadNotice(`Loaded markdown from ${file.name}.`);
      } catch {
        setMarkdownUploadError("Unable to read markdown file.");
        setMarkdownUploadNotice(null);
      }
    });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files.item(0);
    handleMarkdownFile(file);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!isDragActive) {
      setIsDragActive(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
  }

  function handleImageUploadAndRewrite() {
    if (selectedImageFiles.length === 0) {
      setImageUploadError("Select image files before uploading.");
      setImageUploadNotice(null);
      return;
    }

    startImageUpload(async () => {
      const formData = new FormData();
      formData.set("markdownContent", content);
      for (const reference of localImageReferences) {
        formData.append("localImageReference", reference);
      }
      for (const file of selectedImageFiles) {
        formData.append("imageFiles", file);
      }

      const result = await uploadMarkdownImagesAction(formData);
      if (result.error) {
        setImageUploadError(result.error);
        setImageUploadNotice(null);
        return;
      }

      setContent(result.rewrittenContent);
      setLocalImageReferences(result.unmatchedReferences);
      setSelectedImageFiles([]);
      setImageUploadError(null);

      if (result.replacedReferences.length === 0) {
        setImageUploadNotice("No matching local image references were rewritten.");
      } else if (result.unmatchedReferences.length === 0) {
        setImageUploadNotice(
          `Uploaded and rewrote ${result.replacedReferences.length} image reference(s).`
        );
      } else {
        setImageUploadNotice(
          `Uploaded and rewrote ${result.replacedReferences.length} image reference(s). ${result.unmatchedReferences.length} reference(s) still unmatched.`
        );
      }
    });
  }

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

        <section className="space-y-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`rounded-xl border px-4 py-6 text-center transition ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-border bg-background/80"
            }`}
          >
            <h2 className="text-sm font-medium text-foreground">Markdown Upload</h2>
            <p className="mt-1 text-sm text-muted">
              Drag and drop a <code>.md</code> file here, or choose one manually.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
              <input
                type="file"
                accept=".md,text/markdown"
                className="w-full max-w-xs cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted"
                onChange={(event) => {
                  const file = event.target.files?.item(0) ?? null;
                  handleMarkdownFile(file);
                  event.currentTarget.value = "";
                }}
              />
              {isParsingMarkdown ? (
                <span className="text-xs text-muted">Parsing markdown…</span>
              ) : null}
            </div>
          </div>

          {markdownUploadError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {markdownUploadError}
            </p>
          ) : null}

          {markdownUploadNotice ? (
            <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
              {markdownUploadNotice}
            </p>
          ) : null}
        </section>

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

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Category</span>
            <select
              name="categoryId"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
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

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Date</span>
            <input
              name="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              placeholder="2026-03-30"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Tags</span>
            <input
              name="tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="react, typescript, nextjs"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Cover Image URL</span>
            <input
              name="coverImage"
              type="url"
              value={coverImage}
              onChange={(event) => setCoverImage(event.target.value)}
              placeholder="https://example.com/cover.jpg"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="font-medium text-foreground">Excerpt</span>
          <textarea
            name="excerpt"
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        {localImageReferences.length > 0 ? (
          <section className="space-y-3 rounded-xl border border-border bg-background p-4">
            <h2 className="text-sm font-medium text-foreground">Detected local images</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              {localImageReferences.map((reference) => (
                <li key={reference}>{reference}</li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="image/*"
                multiple
                className="w-full max-w-xs cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted"
                onChange={(event) => {
                  setSelectedImageFiles(Array.from(event.target.files ?? []));
                  setImageUploadError(null);
                }}
              />
              <span className="text-xs text-muted">
                {selectedImageFiles.length > 0
                  ? `${selectedImageFiles.length} image file(s) selected`
                  : "No image files selected"}
              </span>
              <button
                type="button"
                onClick={handleImageUploadAndRewrite}
                disabled={isUploadingImages || selectedImageFiles.length === 0}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploadingImages ? "Uploading..." : "Upload images and rewrite paths"}
              </button>
            </div>

            {imageUploadError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {imageUploadError}
              </p>
            ) : null}

            {imageUploadNotice ? (
              <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                {imageUploadNotice}
              </p>
            ) : null}
          </section>
        ) : null}

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
