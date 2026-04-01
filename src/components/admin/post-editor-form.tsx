"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type DragEvent,
} from "react";
import { useLocaleContext } from "@/components/i18n/locale-provider";
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
  availableTags: string[];
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

function parseTagsInput(value: string) {
  const deduped = new Map<string, string>();

  for (const token of value.split(",")) {
    const normalized = token.trim();
    if (!normalized) {
      continue;
    }

    const lower = normalized.toLowerCase();
    if (!deduped.has(lower)) {
      deduped.set(lower, normalized);
    }
  }

  return Array.from(deduped.values());
}

export function PostEditorForm({
  mode,
  categories,
  availableTags,
  initialValues,
  action,
  postId,
}: PostEditorFormProps) {
  const { dictionary } = useLocaleContext();
  const postsDictionary = dictionary.admin.posts;
  const editorDictionary = postsDictionary.editor;
  const [state, formAction, isPending] = useActionState(action, INITIAL_ACTION_STATE);
  const [title, setTitle] = useState(initialValues.title);
  const [slug, setSlug] = useState(initialValues.slug);
  const [date, setDate] = useState(initialValues.date);
  const [content, setContent] = useState(initialValues.content);
  const [excerpt, setExcerpt] = useState(initialValues.excerpt);
  const [categoryId, setCategoryId] = useState(initialValues.categoryId);
  const [selectedTags, setSelectedTags] = useState(() =>
    parseTagsInput(initialValues.tags)
  );
  const [tagDraft, setTagDraft] = useState("");
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

  const availableTagSuggestions = useMemo(() => {
    const selectedTagSet = new Set(selectedTags.map((tag) => tag.toLowerCase()));
    return availableTags.filter((tag) => !selectedTagSet.has(tag.toLowerCase()));
  }, [availableTags, selectedTags]);

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
          setPreviewError(editorDictionary.previewError);
        }
      }
    }

    loadPreview();

    return () => {
      disposed = true;
    };
  }, [content, editorDictionary.previewError]);

  const formTitle = useMemo(
    () => (mode === "create" ? editorDictionary.newTitle : editorDictionary.editTitle),
    [editorDictionary.editTitle, editorDictionary.newTitle, mode]
  );

  function addTagsFromValue(rawValue: string) {
    const nextTags = parseTagsInput(rawValue);
    if (nextTags.length === 0) {
      return;
    }

    setSelectedTags((previous) => {
      const merged = new Map<string, string>();

      for (const tag of previous) {
        merged.set(tag.toLowerCase(), tag);
      }

      for (const tag of nextTags) {
        if (!merged.has(tag.toLowerCase())) {
          merged.set(tag.toLowerCase(), tag);
        }
      }

      return Array.from(merged.values());
    });

    setTagDraft("");
  }

  function removeTag(tagToRemove: string) {
    setSelectedTags((previous) =>
      previous.filter((tag) => tag.toLowerCase() !== tagToRemove.toLowerCase())
    );
  }

  function handleMarkdownFile(file: File | null) {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".md")) {
      setMarkdownUploadError(editorDictionary.onlyMarkdownFiles);
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
        setSelectedTags(parseTagsInput(parsed.frontmatter.tags));
        setTagDraft("");
        setExcerpt(parsed.frontmatter.excerpt);
        setCoverImage(parsed.frontmatter.coverImage);
        setCategoryId(matchedCategoryId ? String(matchedCategoryId) : "");
        setContent(parsed.content);
        setLocalImageReferences(parsed.localImageReferences);
        setSelectedImageFiles([]);
        setImageUploadError(null);
        setImageUploadNotice(
          parsed.localImageReferences.length > 0
            ? editorDictionary.detectedLocalImageReferencesTemplate.replace(
                "{count}",
                String(parsed.localImageReferences.length)
              )
            : editorDictionary.noLocalImageReferencesDetected
        );
        setMarkdownUploadError(null);
        setMarkdownUploadNotice(
          editorDictionary.loadedMarkdownTemplate.replace("{fileName}", file.name)
        );
      } catch {
        setMarkdownUploadError(editorDictionary.unableToReadFile);
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
      setImageUploadError(editorDictionary.selectImagesFirst);
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
        setImageUploadNotice(editorDictionary.noReferencesRewritten);
      } else if (result.unmatchedReferences.length === 0) {
        setImageUploadNotice(
          editorDictionary.rewroteAllReferencesTemplate.replace(
            "{count}",
            String(result.replacedReferences.length)
          )
        );
      } else {
        setImageUploadNotice(
          editorDictionary.rewrotePartialReferencesTemplate
            .replace("{replaced}", String(result.replacedReferences.length))
            .replace("{unmatched}", String(result.unmatchedReferences.length))
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
            ? editorDictionary.newDescription
            : editorDictionary.editDescription}
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
            <h2 className="text-sm font-medium text-foreground">
              {editorDictionary.markdownUploadHeading}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {editorDictionary.markdownUploadDescription}
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
                <span className="text-xs text-muted">{editorDictionary.parsingLabel}</span>
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
            <span className="font-medium text-foreground">{editorDictionary.titleLabel}</span>
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
            <span className="font-medium text-foreground">{editorDictionary.slugLabel}</span>
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
            <span className="font-medium text-foreground">{editorDictionary.categoryLabel}</span>
            <select
              name="categoryId"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">{postsDictionary.uncategorizedLabel}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">{editorDictionary.statusLabel}</span>
            <select
              name="status"
              defaultValue={initialValues.status}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="draft">{postsDictionary.status.draft}</option>
              <option value="published">{postsDictionary.status.published}</option>
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">{editorDictionary.dateLabel}</span>
            <input
              name="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              placeholder={editorDictionary.datePlaceholder}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-foreground">{editorDictionary.tagsLabel}</span>
              <span className="text-xs text-muted">{editorDictionary.tagsHelper}</span>
            </div>

            <input type="hidden" name="tags" value={selectedTags.join(", ")} />

            <div className="space-y-2 rounded-xl border border-border bg-background p-3">
              {selectedTags.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <li
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="rounded-full p-0.5 text-muted transition hover:bg-background hover:text-foreground"
                        aria-label={editorDictionary.removeTagAriaTemplate.replace(
                          "{tag}",
                          tag
                        )}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted">{editorDictionary.noTagsLabel}</p>
              )}

              <div className="flex flex-wrap gap-2">
                <input
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      addTagsFromValue(tagDraft);
                    }
                  }}
                  onBlur={() => addTagsFromValue(tagDraft)}
                  list="available-tag-options"
                  placeholder={editorDictionary.tagsPlaceholder}
                  className="min-w-52 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => addTagsFromValue(tagDraft)}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-medium transition hover:bg-secondary"
                >
                  {editorDictionary.addTagButton}
                </button>
              </div>

              {availableTagSuggestions.length > 0 ? (
                <datalist id="available-tag-options">
                  {availableTagSuggestions.map((tag) => (
                    <option key={tag} value={tag} />
                  ))}
                </datalist>
              ) : null}
            </div>
          </section>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">{editorDictionary.coverImageLabel}</span>
            <input
              name="coverImage"
              type="url"
              value={coverImage}
              onChange={(event) => setCoverImage(event.target.value)}
              placeholder={editorDictionary.coverImagePlaceholder}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="font-medium text-foreground">{editorDictionary.excerptLabel}</span>
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
            <h2 className="text-sm font-medium text-foreground">
              {editorDictionary.localImagesHeading}
            </h2>
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
                  ? editorDictionary.selectedImageFilesTemplate.replace(
                      "{count}",
                      String(selectedImageFiles.length)
                    )
                  : editorDictionary.noImageFilesSelected}
              </span>
              <button
                type="button"
                onClick={handleImageUploadAndRewrite}
                disabled={isUploadingImages || selectedImageFiles.length === 0}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploadingImages
                  ? editorDictionary.uploadingImagesButton
                  : editorDictionary.uploadImagesButton}
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
            <span className="font-medium text-foreground">{editorDictionary.contentLabel}</span>
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
            <h2 className="text-sm font-medium text-foreground">
              {editorDictionary.previewHeading}
            </h2>
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
              ? editorDictionary.creatingButton
              : editorDictionary.savingButton
            : mode === "create"
              ? editorDictionary.createButton
              : editorDictionary.saveButton}
        </button>
      </form>
    </div>
  );
}
