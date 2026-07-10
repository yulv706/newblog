import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  READING_BOOKS,
  getBookCategories,
  getBooksByStatus,
  getReadingStats,
  getRecentBookNotes,
} from "@/lib/books";
import { getDictionary } from "@/lib/i18n/dictionaries";

describe("reading bookshelf data", () => {
  it("provides a balanced shelf with status counts and localized categories", () => {
    const stats = getReadingStats();

    expect(READING_BOOKS.length).toBeGreaterThanOrEqual(6);
    expect(stats.total).toBe(READING_BOOKS.length);
    expect(stats.reading).toBe(2);
    expect(stats.finished).toBeGreaterThanOrEqual(3);
    expect(stats.queued).toBe(1);
    expect(stats.notes).toBe(READING_BOOKS.length);

    expect(getBooksByStatus("reading").map((book) => book.status)).toEqual(["reading", "reading"]);
    expect(getBookCategories("zh-CN")).toContain("系统设计");
    expect(getBookCategories("en")).toContain("Systems");
  });

  it("exposes recent reading notes for the notes section", () => {
    const notes = getRecentBookNotes(READING_BOOKS, 3);

    expect(notes).toHaveLength(3);
    expect(notes.every((book) => book.quote["zh-CN"].length > 0)).toBe(true);
    expect(notes.every((book) => book.quote.en.length > 0)).toBe(true);
  });
});

describe("books page wiring", () => {
  it("uses localized dictionaries, metadata, and the shared reading data", () => {
    const pageSource = fs.readFileSync(path.join(process.cwd(), "src/app/books/page.tsx"), "utf8");
    const interactiveShelfSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/books/interactive-bookshelf.tsx"),
      "utf8"
    );
    const readingBooksSource = fs.readFileSync(
      path.join(process.cwd(), "src/lib/reading-books.ts"),
      "utf8"
    );
    const animationsSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/ui/animations.tsx"),
      "utf8"
    );
    const syncSource = fs.readFileSync(path.join(process.cwd(), "scripts/sync-weread.js"), "utf8");
    const zh = getDictionary("zh-CN");
    const en = getDictionary("en");

    expect(pageSource).toContain("getRequestI18n");
    expect(pageSource).toContain("buildLocalizedMetadataFields");
    expect(pageSource).toContain("getPublicReadingBooks");
    expect(pageSource).toContain("InteractiveBookshelf");
    expect(pageSource).not.toContain("visibleCategories");
    expect(pageSource).not.toContain("hiddenCategoryCount");
    expect(interactiveShelfSource).toContain("AnimatePresence");
    expect(interactiveShelfSource).toContain("data-book-card");
    expect(interactiveShelfSource).toContain("data-book-dialog");
    expect(interactiveShelfSource).toContain("data-shelf-category-filter");
    expect(interactiveShelfSource).toContain("data-shelf-category-option");
    expect(interactiveShelfSource).toContain("data-shelf-category-toggle");
    expect(interactiveShelfSource).toContain("data-shelf-result-summary");
    expect(interactiveShelfSource).toContain("data-shelf-controls");
    expect(interactiveShelfSource).toContain("data-shelf-search");
    expect(interactiveShelfSource).toContain("data-shelf-status-filter");
    expect(interactiveShelfSource).toContain("data-shelf-sort");
    expect(interactiveShelfSource).toContain("data-shelf-pagination");
    expect(interactiveShelfSource).toContain("SHELF_BOOKS_PER_PAGE");
    expect(interactiveShelfSource).toContain("COLLAPSED_CATEGORY_LIMIT");
    expect(interactiveShelfSource).toContain("visibleCategoryOptions");
    expect(interactiveShelfSource).toContain("filteredShelfBooks");
    expect(interactiveShelfSource).toContain("ANNOTATIONS_PER_PAGE");
    expect(interactiveShelfSource).toContain("const ANNOTATIONS_PER_PAGE = 1");
    expect(interactiveShelfSource).toContain("data-notes-pagination");
    expect(interactiveShelfSource).toContain("closeButtonRef.current?.focus()");
    expect(interactiveShelfSource).toContain('event.key !== "Tab"');
    expect(interactiveShelfSource).toContain("previouslyFocusedElement.focus()");
    expect(animationsSource).toContain('cn("min-w-0", className)');
    expect(pageSource).toContain('className="grid grid-cols-1 gap-7 md:grid-cols-3"');
    expect(interactiveShelfSource).toContain("CurrentReadingStage");
    expect(interactiveShelfSource).toContain("getPaginationItems");
    expect(interactiveShelfSource).toContain("lucide-react");
    expect(interactiveShelfSource).not.toContain("rotateY");
    expect(interactiveShelfSource).not.toContain("perspective");
    expect(interactiveShelfSource).not.toContain("transform-style");
    expect(readingBooksSource).toContain("readingNotes");
    expect(readingBooksSource).toContain("mapSyncedAnnotation");
    expect(syncSource).toContain("/review/list/mine");
    expect(syncSource).toContain("WEREAD_SYNC_REVIEW_PAGE_LIMIT");
    expect(zh.public.books.wordsTemplate).toBe("{words} 字");
    expect(en.public.books.openInWereadLabel).toBe("Open in WeRead");
    expect(zh.public.books.title).toBe("书与札记");
    expect(en.public.books.title).toBe("Books & Notes");
    expect(zh.public.books.openBookTemplate).toBe("打开《{title}》");
    expect(zh.public.books.thoughtLabel).toBe("感想");
    expect(zh.public.books.categoryFilterAllLabel).toBe("全部");
    expect(en.public.books.detailsHeading).toBe("Reading Details");
    expect(en.public.books.categoryFilterHeading).toBe("Filter by theme");
    expect(en.public.books.nextNotesPageLabel).toBe("Next");
    expect(zh.public.books.searchBooksPlaceholder).toBe("搜索书名、作者或主题");
    expect(en.public.books.sortOptions.rating).toBe("Highest rated");
  });
});
