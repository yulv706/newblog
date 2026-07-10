#!/usr/bin/env node

const Database = require("better-sqlite3");
const path = require("node:path");

const GATEWAY_URL =
  process.env.WEREAD_GATEWAY_URL || "https://i.weread.qq.com/api/agent/gateway";
const SKILL_VERSION = process.env.WEREAD_SKILL_VERSION || "1.0.4";
const DB_PATH =
  process.env.BLOG_DB_PATH || path.join(process.cwd(), "data", "blog.db");
const SYNC_KEY = "weread";

function getBooleanEnv(name, defaultValue = false) {
  const value = process.env[name];
  if (value == null || value.trim() === "") {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function getIntegerEnv(name, defaultValue) {
  const value = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(value) && value >= 0 ? value : defaultValue;
}

function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}

function toInteger(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  const wanMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*万/);
  if (wanMatch) {
    return Math.round(Number.parseFloat(wanMatch[1]) * 10000);
  }

  const numeric = Number.parseInt(trimmed.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function unixToIso(value) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return null;
  }

  const milliseconds = timestamp > 1000000000000 ? timestamp : timestamp * 1000;
  return new Date(milliseconds).toISOString();
}

function parseYear(value) {
  const match = String(value || "").match(/\b(19|20)\d{2}\b/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function compactString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWereadRating(value) {
  const rating = toInteger(value, 0);
  if (rating <= 0) {
    return null;
  }

  // WeRead exposes newRating on a 0-1000 scale. Persist tenths so the
  // application can render the existing 0-5 rating contract accurately.
  return Math.max(1, Math.min(50, Math.round(rating / 20)));
}

function hashString(value) {
  return Array.from(value).reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 0);
}

function getReviewPayload(item) {
  const review =
    item?.review && typeof item.review === "object" ? item.review : item;

  if (review?.review && typeof review.review === "object") {
    return review.review;
  }

  return review && typeof review === "object" ? review : null;
}

function getReviewSourceId(bookId, review, originalText, thoughtText) {
  const reviewId = compactString(review?.reviewId || review?.id);
  if (reviewId) {
    return `${bookId}:review:${reviewId}`;
  }

  const fallback = [
    compactString(review?.range),
    compactString(review?.chapterUid),
    compactString(review?.createTime),
    originalText,
    thoughtText,
  ]
    .filter(Boolean)
    .join(":");

  return `${bookId}:review:auto-${hashString(fallback || `${bookId}:review`)}`;
}

function unwrapGatewayResponse(payload) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  if (payload.upgrade_info) {
    const message =
      payload.upgrade_info.message || "WeRead Skill requires an upgrade.";
    throw new Error(message);
  }

  if (payload.errcode && payload.errcode !== 0) {
    throw new Error(payload.errmsg || `WeRead API error: ${payload.errcode}`);
  }

  if ("data" in payload && payload.data && typeof payload.data === "object") {
    return payload.data;
  }

  return payload;
}

async function callGateway(apiName, params = {}) {
  const apiKey = compactString(process.env.WEREAD_API_KEY);
  if (!apiKey) {
    throw new Error("WEREAD_API_KEY is not configured.");
  }

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_name: apiName,
      ...params,
      skill_version: SKILL_VERSION,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WeRead API ${apiName} failed with ${response.status}: ${body}`);
  }

  return unwrapGatewayResponse(await response.json());
}

async function fetchBookReviews(bookId) {
  const pageLimit = Math.max(1, getIntegerEnv("WEREAD_SYNC_REVIEW_PAGE_LIMIT", 3));
  const count = Math.max(1, getIntegerEnv("WEREAD_SYNC_REVIEW_PAGE_SIZE", 20));
  const reviews = [];
  let synckey = 0;

  for (let page = 0; page < pageLimit; page += 1) {
    const payload = { bookid: bookId, count };
    if (synckey) {
      payload.synckey = synckey;
    }

    const response = await callGateway("/review/list/mine", payload);
    const pageReviews = Array.isArray(response.reviews) ? response.reviews : [];
    reviews.push(...pageReviews);

    const nextSynckey = Number(response.synckey || response.syncKey || 0);
    if (!response.hasMore || !nextSynckey || pageReviews.length === 0) {
      break;
    }

    synckey = nextSynckey;
  }

  return reviews;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Map();
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const current = items[cursor];
      cursor += 1;

      try {
        results.set(current, await mapper(current));
      } catch (error) {
        results.set(current, { __syncError: error.message || String(error) });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () =>
      worker()
    )
  );

  return results;
}

function getShelfBookStatus(book, progress) {
  const progressValue = clampPercent(progress?.book?.progress ?? progress?.progress);
  if (book.finishReading === 1 || progressValue >= 100 || progress?.book?.finishTime) {
    return "finished";
  }

  if (progressValue > 0) {
    return "reading";
  }

  return "queued";
}

function normalizeBook(book, notebook, detail, progress) {
  const progressValue = clampPercent(
    progress?.book?.progress ?? notebook?.readingProgress ?? 0
  );
  const sourceId = compactString(book.bookId);
  const wordCount = toInteger(detail?.wordCount, 0);
  const finishTime = progress?.book?.finishTime;

  return {
    source: "weread_book",
    sourceId,
    title: compactString(detail?.title) || compactString(book.title) || "Untitled",
    author: compactString(detail?.author) || compactString(book.author),
    cover: compactString(detail?.cover) || compactString(book.cover) || null,
    category: compactString(detail?.category) || compactString(book.category) || null,
    status: getShelfBookStatus(book, progress),
    progress: progressValue,
    rating: normalizeWereadRating(detail?.newRating),
    pages: wordCount > 0 ? Math.max(1, Math.round(wordCount / 500)) : 0,
    year: parseYear(detail?.publishTime),
    wordCount,
    noteCount: toInteger(notebook?.noteCount, 0),
    reviewCount: toInteger(notebook?.reviewCount, 0),
    bookmarkCount: toInteger(notebook?.bookmarkCount, 0),
    readingSeconds: toInteger(progress?.book?.recordReadingTime, 0),
    latestNote: null,
    deepLink: compactString(detail?.deepLink) || compactString(book.deepLink) || null,
    isPrivate: book.secret === 1,
    isTop: book.isTop === 1,
    readUpdatedAt: unixToIso(progress?.book?.updateTime ?? book.readUpdateTime),
    finishedAt: unixToIso(finishTime),
    rawPayload: JSON.stringify({ shelf: book, notebook, detail, progress }),
  };
}

function normalizeAlbum(album) {
  const info = album.albumInfo || {};
  const extra = album.albumInfoExtra || {};
  const sourceId = `album:${compactString(info.albumId)}`;
  const finished = info.finish === 1 || compactString(info.finishStatus) === "已完结";

  return {
    source: "weread_album",
    sourceId,
    title: compactString(info.name) || "Untitled Album",
    author: compactString(info.authorName),
    cover: compactString(info.cover) || null,
    category: "Audio",
    status: finished ? "finished" : extra.lectureReadUpdateTime ? "reading" : "queued",
    progress: finished ? 100 : 0,
    rating: null,
    pages: 0,
    year: null,
    wordCount: 0,
    noteCount: 0,
    reviewCount: 0,
    bookmarkCount: 0,
    readingSeconds: 0,
    latestNote: compactString(info.intro) || null,
    deepLink: null,
    isPrivate: extra.secret === 1,
    isTop: extra.isTop === 1,
    readUpdatedAt: unixToIso(extra.lectureReadUpdateTime ?? info.updateTime),
    finishedAt: null,
    rawPayload: JSON.stringify(album),
  };
}

async function fetchNotebookMap() {
  const notebookMap = new Map();
  const pageLimit = getIntegerEnv("WEREAD_SYNC_NOTEBOOK_PAGE_LIMIT", 20);
  let lastSort;

  for (let page = 0; page < pageLimit; page += 1) {
    const payload = { count: 100 };
    if (lastSort) {
      payload.lastSort = lastSort;
    }

    const response = await callGateway("/user/notebooks", payload);
    const books = Array.isArray(response.books) ? response.books : [];

    for (const item of books) {
      const bookId = compactString(item.bookId || item.book?.bookId);
      if (!bookId) {
        continue;
      }

      notebookMap.set(bookId, {
        ...item,
        totalNoteCount:
          toInteger(item.reviewCount, 0) +
          toInteger(item.noteCount, 0) +
          toInteger(item.bookmarkCount, 0),
      });
    }

    if (!response.hasMore || books.length === 0) {
      break;
    }

    lastSort = books[books.length - 1]?.sort;
    if (!lastSort) {
      break;
    }
  }

  return notebookMap;
}

function createPreparedStatements(db) {
  return {
    upsertBook: db.prepare(`
      INSERT INTO reading_books (
        source, source_id, title, author, cover, category, status, progress,
        rating, pages, year, word_count, note_count, review_count, bookmark_count,
        reading_seconds, latest_note, deep_link, is_private, is_top, read_updated_at,
        finished_at, archived_at, raw_payload, synced_at, created_at, updated_at
      )
      VALUES (
        @source, @sourceId, @title, @author, @cover, @category, @status, @progress,
        @rating, @pages, @year, @wordCount, @noteCount, @reviewCount, @bookmarkCount,
        @readingSeconds, @latestNote, @deepLink, @isPrivate, @isTop, @readUpdatedAt,
        @finishedAt, NULL, @rawPayload, @syncedAt, @createdAt, @updatedAt
      )
      ON CONFLICT(source_id) DO UPDATE SET
        source = excluded.source,
        title = excluded.title,
        author = excluded.author,
        cover = excluded.cover,
        category = excluded.category,
        status = excluded.status,
        progress = excluded.progress,
        rating = excluded.rating,
        pages = excluded.pages,
        year = excluded.year,
        word_count = excluded.word_count,
        note_count = excluded.note_count,
        review_count = excluded.review_count,
        bookmark_count = excluded.bookmark_count,
        reading_seconds = excluded.reading_seconds,
        latest_note = COALESCE(reading_books.latest_note, excluded.latest_note),
        deep_link = excluded.deep_link,
        is_private = excluded.is_private,
        is_top = excluded.is_top,
        read_updated_at = excluded.read_updated_at,
        finished_at = excluded.finished_at,
        archived_at = NULL,
        raw_payload = excluded.raw_payload,
        synced_at = excluded.synced_at,
        updated_at = excluded.updated_at
    `),
    archiveExistingBooks: db.prepare(`
      UPDATE reading_books
      SET archived_at = @archivedAt, updated_at = @archivedAt
      WHERE source IN ('weread_book', 'weread_album')
        AND archived_at IS NULL
    `),
    clearBookNotes: db.prepare(
      "DELETE FROM reading_notes WHERE book_source_id = @bookSourceId"
    ),
    upsertNote: db.prepare(`
      INSERT INTO reading_notes (
        source_id, book_source_id, type, content, abstract, chapter_title,
        created_at, raw_payload, synced_at
      )
      VALUES (
        @sourceId, @bookSourceId, @type, @content, @abstract, @chapterTitle,
        @createdAt, @rawPayload, @syncedAt
      )
      ON CONFLICT(source_id) DO UPDATE SET
        type = excluded.type,
        content = excluded.content,
        abstract = excluded.abstract,
        chapter_title = excluded.chapter_title,
        created_at = excluded.created_at,
        raw_payload = excluded.raw_payload,
        synced_at = excluded.synced_at
    `),
    updateLatestNote: db.prepare(`
      UPDATE reading_books
      SET latest_note = @latestNote, updated_at = @updatedAt
      WHERE source_id = @bookSourceId
    `),
    updateState: db.prepare(`
      INSERT INTO reading_sync_state (
        key, status, message, total_books, total_notes, started_at, finished_at, payload
      )
      VALUES (
        @key, @status, @message, @totalBooks, @totalNotes, @startedAt, @finishedAt, @payload
      )
      ON CONFLICT(key) DO UPDATE SET
        status = excluded.status,
        message = excluded.message,
        total_books = excluded.total_books,
        total_notes = excluded.total_notes,
        started_at = excluded.started_at,
        finished_at = excluded.finished_at,
        payload = excluded.payload
    `),
  };
}

async function syncHighlights(db, statements, sourceIds, syncedAt) {
  if (!getBooleanEnv("WEREAD_SYNC_HIGHLIGHTS", false)) {
    return {
      noteCount: 0,
      skippedBookIds: [],
    };
  }

  const limit = getIntegerEnv("WEREAD_SYNC_HIGHLIGHT_BOOK_LIMIT", 10);
  const bookIds = sourceIds
    .filter((sourceId) => !sourceId.startsWith("album:"))
    .slice(0, limit);
  const stagedBooks = [];
  const skippedBookIds = [];

  for (const bookId of bookIds) {
    try {
      let latestNote = null;
      const notes = [];
      const response = await callGateway("/book/bookmarklist", { bookId });
      const highlights = Array.isArray(response.updated) ? response.updated : [];
      const sortedHighlights = highlights
        .filter((item) => compactString(item.markText))
        .sort(
          (left, right) =>
            Number(right.createTime || 0) - Number(left.createTime || 0)
        )
        .slice(0, 20);

      for (const item of sortedHighlights) {
        const content = compactString(item.markText);
        if (!content) {
          continue;
        }

        if (!latestNote) {
          latestNote = content;
        }

        notes.push({
          sourceId: `${bookId}:highlight:${compactString(item.bookmarkId)}`,
          bookSourceId: bookId,
          type: "highlight",
          content,
          abstract: null,
          chapterTitle: null,
          createdAt: unixToIso(item.createTime),
          rawPayload: JSON.stringify(item),
          syncedAt,
        });
      }

      const reviews = await fetchBookReviews(bookId);
      const sortedReviews = reviews
        .map(getReviewPayload)
        .filter(Boolean)
        .sort(
          (left, right) =>
            Number(right.createTime || 0) - Number(left.createTime || 0)
        )
        .slice(0, 40);

      for (const review of sortedReviews) {
        const thoughtText = compactString(review.content);
        const originalText = compactString(review.abstract);
        if (!thoughtText && !originalText) {
          continue;
        }

        const content = originalText || thoughtText;
        const abstract = originalText && thoughtText ? thoughtText : null;
        if (!latestNote) {
          latestNote = content;
        }

        notes.push({
          sourceId: getReviewSourceId(bookId, review, originalText, thoughtText),
          bookSourceId: bookId,
          type: "review",
          content,
          abstract,
          chapterTitle: compactString(review.chapterName) || null,
          createdAt: unixToIso(review.createTime),
          rawPayload: JSON.stringify(review),
          syncedAt,
        });
      }

      stagedBooks.push({
        bookId,
        latestNote,
        notes,
      });
    } catch (error) {
      skippedBookIds.push(bookId);
      console.warn(
        `WeRead note sync skipped for ${bookId}; existing notes were preserved: ${
          error.message || String(error)
        }`
      );
    }
  }

  if (bookIds.length > 0 && stagedBooks.length === 0) {
    throw new Error(
      `WeRead note sync failed for all ${bookIds.length} selected book(s); existing notes were preserved.`
    );
  }

  const replaceBookNotes = db.transaction((books) => {
    for (const stagedBook of books) {
      statements.clearBookNotes.run({ bookSourceId: stagedBook.bookId });

      for (const note of stagedBook.notes) {
        statements.upsertNote.run(note);
      }

      statements.updateLatestNote.run({
        bookSourceId: stagedBook.bookId,
        latestNote: stagedBook.latestNote,
        updatedAt: syncedAt,
      });
    }
  });
  replaceBookNotes(stagedBooks);

  return {
    noteCount: stagedBooks.reduce((total, book) => total + book.notes.length, 0),
    skippedBookIds,
  };
}

async function syncWeread() {
  const startedAt = new Date().toISOString();
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  const statements = createPreparedStatements(db);
  statements.updateState.run({
    key: SYNC_KEY,
    status: "running",
    message: "Sync started.",
    totalBooks: 0,
    totalNotes: 0,
    startedAt,
    finishedAt: null,
    payload: null,
  });

  try {
    const includeAlbums = getBooleanEnv("WEREAD_SYNC_INCLUDE_ALBUMS", true);
    const progressLimit = getIntegerEnv("WEREAD_SYNC_PROGRESS_LIMIT", 80);
    const detailLimit = getIntegerEnv("WEREAD_SYNC_DETAIL_LIMIT", 80);
    const concurrency = Math.max(1, getIntegerEnv("WEREAD_SYNC_CONCURRENCY", 4));
    const shelf = await callGateway("/shelf/sync");
    const shelfBooks = Array.isArray(shelf.books) ? shelf.books : [];
    const albums = includeAlbums && Array.isArray(shelf.albums) ? shelf.albums : [];
    const notebookMap = getBooleanEnv("WEREAD_SYNC_NOTEBOOKS", true)
      ? await fetchNotebookMap()
      : new Map();

    const sortedBooks = [...shelfBooks].sort((left, right) => {
      const topDelta = toInteger(right.isTop, 0) - toInteger(left.isTop, 0);
      if (topDelta !== 0) {
        return topDelta;
      }

      return (
        toInteger(right.readUpdateTime || right.updateTime, 0) -
        toInteger(left.readUpdateTime || left.updateTime, 0)
      );
    });
    const bookIds = sortedBooks.map((book) => compactString(book.bookId)).filter(Boolean);
    const detailMap = await mapWithConcurrency(
      bookIds.slice(0, detailLimit),
      concurrency,
      (bookId) => callGateway("/book/info", { bookId })
    );
    const progressMap = await mapWithConcurrency(
      bookIds.slice(0, progressLimit),
      concurrency,
      (bookId) => callGateway("/book/getprogress", { bookId })
    );
    const syncedAt = new Date().toISOString();
    const normalizedBooks = sortedBooks
      .map((book) => {
        const bookId = compactString(book.bookId);
        return normalizeBook(
          book,
          notebookMap.get(bookId),
          detailMap.get(bookId),
          progressMap.get(bookId)
        );
      })
      .concat(albums.map(normalizeAlbum))
      .filter((book) => book.sourceId);
    const activeSourceIds = normalizedBooks.map((book) => book.sourceId);

    const writeBooks = db.transaction((books) => {
      statements.archiveExistingBooks.run({ archivedAt: syncedAt });

      for (const book of books) {
        const now = new Date().toISOString();
        statements.upsertBook.run({
          ...book,
          isPrivate: book.isPrivate ? 1 : 0,
          isTop: book.isTop ? 1 : 0,
          syncedAt,
          createdAt: now,
          updatedAt: now,
        });
      }

    });
    writeBooks(normalizedBooks);

    const noteSync = await syncHighlights(db, statements, activeSourceIds, syncedAt);
    const syncedNotes = noteSync.noteCount;
    const finishedAt = new Date().toISOString();
    const payload = {
      skillVersion: SKILL_VERSION,
      shelfBooks: shelfBooks.length,
      albums: albums.length,
      notebookBooks: notebookMap.size,
      detailLimit,
      progressLimit,
      highlightsEnabled: getBooleanEnv("WEREAD_SYNC_HIGHLIGHTS", false),
      skippedNoteBooks: noteSync.skippedBookIds.length,
    };

    statements.updateState.run({
      key: SYNC_KEY,
      status: "success",
      message:
        noteSync.skippedBookIds.length > 0
          ? `Sync completed with ${noteSync.skippedBookIds.length} note book(s) skipped; existing notes were preserved.`
          : "Sync completed.",
      totalBooks: normalizedBooks.length,
      totalNotes: syncedNotes,
      startedAt,
      finishedAt,
      payload: JSON.stringify(payload),
    });

    db.close();
    return {
      syncedBooks: normalizedBooks.length,
      visibleBooks: normalizedBooks.filter((book) => !book.isPrivate).length,
      syncedNotes,
      startedAt,
      finishedAt,
      payload,
    };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    statements.updateState.run({
      key: SYNC_KEY,
      status: "error",
      message: error.message || String(error),
      totalBooks: 0,
      totalNotes: 0,
      startedAt,
      finishedAt,
      payload: null,
    });
    db.close();
    throw error;
  }
}

async function main() {
  const jsonMode =
    process.argv.includes("--json") || getBooleanEnv("WEREAD_SYNC_JSON", false);

  try {
    const result = await syncWeread();
    if (jsonMode) {
      console.log(JSON.stringify({ ok: true, ...result }));
    } else {
      console.log(
        `WeRead sync completed: ${result.syncedBooks} item(s), ${result.syncedNotes} note(s).`
      );
    }
  } catch (error) {
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, error: error.message || String(error) }));
    } else {
      console.error(error.message || String(error));
    }
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  createPreparedStatements,
  normalizeBook,
  normalizeWereadRating,
  syncHighlights,
};
