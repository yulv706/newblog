import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  READING_BOOKS,
  type ReadingBook,
  type ReadingBookAnnotation,
  type ReadingStatus,
} from "@/lib/books";
import { db } from "@/lib/db";
import { readingBooks, readingNotes, readingSyncState } from "@/lib/db/schema";

type ReadingBookRow = typeof readingBooks.$inferSelect;
type ReadingNoteRow = typeof readingNotes.$inferSelect;

const coverPalettes = [
  {
    background: "linear-gradient(140deg, #edf2f7 0%, #9aa9b8 52%, #243949 100%)",
    spine: "#1d3140",
    foreground: "#142431",
  },
  {
    background: "linear-gradient(140deg, #f4efe5 0%, #c7a678 50%, #65442d 100%)",
    spine: "#573824",
    foreground: "#2e2118",
  },
  {
    background: "linear-gradient(140deg, #eef3e8 0%, #91ac7d 48%, #304b3f 100%)",
    spine: "#263d33",
    foreground: "#1d2f28",
  },
  {
    background: "linear-gradient(140deg, #f4e9ef 0%, #c98ca5 48%, #60344b 100%)",
    spine: "#533044",
    foreground: "#2d1b26",
  },
  {
    background: "linear-gradient(140deg, #e9eff8 0%, #89a6ce 50%, #244869 100%)",
    spine: "#1e3b56",
    foreground: "#172b40",
  },
] as const;

function hashString(value: string) {
  return Array.from(value).reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 0);
}

function getCoverPalette(seed: string) {
  return coverPalettes[hashString(seed) % coverPalettes.length];
}

function getCoverLabel(title: string) {
  const words = title
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return title.slice(0, 4).toUpperCase() || "BOOK";
}

function normalizeStatus(status: string): ReadingStatus {
  if (status === "reading" || status === "finished" || status === "queued") {
    return status;
  }

  return "queued";
}

function formatDurationZh(seconds: number) {
  const minutes = Math.max(0, Math.round(seconds / 60));
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
}

function formatDurationEn(seconds: number) {
  const minutes = Math.max(0, Math.round(seconds / 60));
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

function getSyncedNote(row: ReadingBookRow) {
  if (row.readingSeconds > 0) {
    return {
      "zh-CN": `微信读书同步：累计阅读 ${formatDurationZh(row.readingSeconds)}，当前进度 ${row.progress}%。`,
      en: `Synced from WeRead: ${formatDurationEn(row.readingSeconds)} logged, ${row.progress}% complete.`,
    };
  }

  return {
    "zh-CN": `微信读书同步：当前进度 ${row.progress}%。`,
    en: `Synced from WeRead: ${row.progress}% complete.`,
  };
}

function getSyncedTakeaway(row: ReadingBookRow) {
  const noteCount = row.noteCount + row.reviewCount + row.bookmarkCount;
  if (noteCount > 0) {
    return {
      "zh-CN": `已同步 ${noteCount} 条笔记、划线或书签统计。`,
      en: `${noteCount} note, highlight, or bookmark record(s) synced.`,
    };
  }

  if (row.status === "finished") {
    return {
      "zh-CN": "已在微信读书标记读完，保留为书架记录。",
      en: "Marked finished in WeRead and kept on the public shelf.",
    };
  }

  return {
    "zh-CN": "同步的是阅读进度快照，后续同步会继续更新。",
    en: "This is a reading-progress snapshot that will update on the next sync.",
  };
}

function mapSyncedAnnotation(row: ReadingNoteRow): ReadingBookAnnotation {
  const content = {
    "zh-CN": row.content,
    en: row.content,
  };
  const thought = row.abstract
    ? {
        "zh-CN": row.abstract,
        en: row.abstract,
      }
    : undefined;

  return {
    id: row.sourceId,
    type: row.type,
    content,
    thought,
    chapterTitle: row.chapterTitle ?? undefined,
    createdAt: row.createdAt ?? undefined,
  };
}

function getAnnotationTimestamp(annotation: ReadingBookAnnotation) {
  const timestamp = annotation.createdAt ? Date.parse(annotation.createdAt) : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortAnnotations(annotations: ReadingBookAnnotation[]) {
  return [...annotations].sort((left, right) => {
    const priorityDelta =
      (right.type === "review" ? 1 : 0) - (left.type === "review" ? 1 : 0);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return getAnnotationTimestamp(right) - getAnnotationTimestamp(left);
  });
}

function getFallbackAnnotation(row: ReadingBookRow) {
  const latestNote = row.latestNote?.trim();

  if (!latestNote) {
    return [];
  }

  return [
    {
      id: `${row.sourceId}:latest-note`,
      type: "highlight" as const,
      content: {
        "zh-CN": latestNote,
        en: latestNote,
      },
      thought: getSyncedTakeaway(row),
    },
  ];
}

function mapSyncedBook(
  row: ReadingBookRow,
  annotations: ReadingBookAnnotation[]
): ReadingBook {
  const palette = getCoverPalette(row.sourceId);
  const bookAnnotations =
    annotations.length > 0 ? sortAnnotations(annotations) : getFallbackAnnotation(row);

  return {
    id: row.sourceId,
    title: row.title,
    author: row.author,
    year: row.year ?? new Date().getFullYear(),
    pages: row.pages,
    wordCount: row.wordCount,
    coverUrl: row.cover ?? undefined,
    category: {
      "zh-CN": row.category || "微信读书",
      en: row.category || "WeRead",
    },
    status: normalizeStatus(row.status),
    progress: row.progress,
    rating: row.rating ? row.rating / 10 : undefined,
    finishedAt: row.finishedAt ?? undefined,
    readUpdatedAt: row.readUpdatedAt ?? undefined,
    syncedAt: row.syncedAt ?? undefined,
    noteCount: row.noteCount + row.reviewCount + row.bookmarkCount,
    readingSeconds: row.readingSeconds,
    deepLink: row.deepLink ?? undefined,
    note: getSyncedNote(row),
    takeaway: getSyncedTakeaway(row),
    quote: {
      "zh-CN": row.latestNote ?? "",
      en: row.latestNote ?? "",
    },
    annotations: bookAnnotations,
    cover: {
      background: palette.background,
      spine: palette.spine,
      foreground: palette.foreground,
      label: getCoverLabel(row.title),
    },
  };
}

export async function getPublicReadingBooks() {
  const rows = db
    .select()
    .from(readingBooks)
    .where(
      and(
        isNull(readingBooks.archivedAt),
        eq(readingBooks.isPrivate, false)
      )
    )
    .orderBy(
      desc(readingBooks.isTop),
      desc(readingBooks.readUpdatedAt),
      desc(readingBooks.updatedAt)
    )
    .all();

  if (rows.length === 0) {
    return READING_BOOKS;
  }

  const notes = db
    .select()
    .from(readingNotes)
    .where(inArray(readingNotes.bookSourceId, rows.map((row) => row.sourceId)))
    .orderBy(desc(readingNotes.createdAt), desc(readingNotes.syncedAt))
    .all();
  const notesByBook = new Map<string, ReadingBookAnnotation[]>();

  for (const note of notes) {
    const mappedNote = mapSyncedAnnotation(note);
    const bookNotes = notesByBook.get(note.bookSourceId) ?? [];
    bookNotes.push(mappedNote);
    notesByBook.set(note.bookSourceId, bookNotes);
  }

  return rows.map((row) => mapSyncedBook(row, notesByBook.get(row.sourceId) ?? []));
}

export async function getReadingSyncSummary() {
  const rows = db
    .select()
    .from(readingBooks)
    .where(isNull(readingBooks.archivedAt))
    .all();
  const state = db
    .select()
    .from(readingSyncState)
    .where(eq(readingSyncState.key, "weread"))
    .get();
  const totalNotes = rows.reduce(
    (total, row) => total + row.noteCount + row.reviewCount + row.bookmarkCount,
    0
  );

  return {
    hasApiKey: Boolean(process.env.WEREAD_API_KEY?.trim()),
    totalBooks: rows.length,
    visibleBooks: rows.filter((row) => !row.isPrivate).length,
    privateBooks: rows.filter((row) => row.isPrivate).length,
    readingBooks: rows.filter((row) => row.status === "reading" && !row.isPrivate)
      .length,
    finishedBooks: rows.filter((row) => row.status === "finished" && !row.isPrivate)
      .length,
    totalNotes,
    state: state ?? null,
  };
}
