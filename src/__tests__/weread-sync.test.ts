import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const require = createRequire(import.meta.url);
type PreparedStatements = Record<
  string,
  { run: (...parameters: unknown[]) => unknown }
>;
const {
  createPreparedStatements,
  normalizeWereadRating,
  syncHighlights,
} = require(path.join(process.cwd(), "scripts", "sync-weread.js")) as {
  createPreparedStatements: (
    database: InstanceType<typeof Database>
  ) => PreparedStatements;
  normalizeWereadRating: (value: unknown) => number | null;
  syncHighlights: (
    database: InstanceType<typeof Database>,
    statements: PreparedStatements,
    sourceIds: string[],
    syncedAt: string
  ) => Promise<{ noteCount: number; skippedBookIds: string[] }>;
};

const tempDirs: string[] = [];
const originalApiKey = process.env.WEREAD_API_KEY;
const originalHighlights = process.env.WEREAD_SYNC_HIGHLIGHTS;

function createReadingDatabase() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "weread-sync-test-"));
  tempDirs.push(tempDir);
  const database = new Database(path.join(tempDir, "blog.db"));
  database.pragma("foreign_keys = ON");
  migrate(drizzle(database), {
    migrationsFolder: path.join(process.cwd(), "src/lib/db/migrations"),
  });

  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO reading_books (
        source, source_id, title, author, status, progress, pages, word_count,
        note_count, review_count, bookmark_count, reading_seconds, is_private,
        is_top, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      "weread_book",
      "book-1",
      "Test Book",
      "Test Author",
      "reading",
      20,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      now,
      now
    );
  database
    .prepare(
      `INSERT INTO reading_notes (
        source_id, book_source_id, type, content, synced_at
      ) VALUES (?, ?, ?, ?, ?)`
    )
    .run("old-note", "book-1", "highlight", "preserve me", now);

  return database;
}

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalApiKey === undefined) {
    delete process.env.WEREAD_API_KEY;
  } else {
    process.env.WEREAD_API_KEY = originalApiKey;
  }
  if (originalHighlights === undefined) {
    delete process.env.WEREAD_SYNC_HIGHLIGHTS;
  } else {
    process.env.WEREAD_SYNC_HIGHLIGHTS = originalHighlights;
  }

  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe("WeRead synchronization", () => {
  it("normalizes WeRead's 0-1000 rating into stored tenths", () => {
    expect(normalizeWereadRating(924)).toBe(46);
    expect(normalizeWereadRating(1000)).toBe(50);
    expect(normalizeWereadRating(0)).toBeNull();
  });

  it("preserves existing notes when every upstream note request fails", async () => {
    const database = createReadingDatabase();
    process.env.WEREAD_API_KEY = "test-key";
    process.env.WEREAD_SYNC_HIGHLIGHTS = "1";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("temporary failure", { status: 503 }))
    );

    await expect(
      syncHighlights(
        database,
        createPreparedStatements(database),
        ["book-1"],
        new Date().toISOString()
      )
    ).rejects.toThrow("existing notes were preserved");

    const notes = database
      .prepare("SELECT source_id, content FROM reading_notes ORDER BY source_id")
      .all();
    database.close();
    expect(notes).toEqual([{ source_id: "old-note", content: "preserve me" }]);
  });

  it("replaces one book's notes only after its upstream payload is complete", async () => {
    const database = createReadingDatabase();
    process.env.WEREAD_API_KEY = "test-key";
    process.env.WEREAD_SYNC_HIGHLIGHTS = "1";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const request = JSON.parse(String(init?.body));
        if (request.api_name === "/book/bookmarklist") {
          return Response.json({
            data: {
              updated: [
                {
                  bookmarkId: "new-note",
                  markText: "new content",
                  createTime: 1_700_000_000,
                },
              ],
            },
          });
        }

        return Response.json({ data: { reviews: [], hasMore: false } });
      })
    );

    const result = await syncHighlights(
      database,
      createPreparedStatements(database),
      ["book-1"],
      new Date().toISOString()
    );
    const notes = database
      .prepare("SELECT source_id, content FROM reading_notes ORDER BY source_id")
      .all();
    database.close();

    expect(result).toEqual({ noteCount: 1, skippedBookIds: [] });
    expect(notes).toEqual([
      { source_id: "book-1:highlight:new-note", content: "new content" },
    ]);
  });

  it("preserves manual management notes during a successful upstream refresh", async () => {
    const database = createReadingDatabase();
    const now = new Date().toISOString();
    database
      .prepare(
        `INSERT INTO reading_notes (
          source_id, book_source_id, type, content, synced_at
        ) VALUES (?, ?, ?, ?, ?)`
      )
      .run("manual:note-1", "book-1", "review", "my reflection", now);
    process.env.WEREAD_API_KEY = "test-key";
    process.env.WEREAD_SYNC_HIGHLIGHTS = "1";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const request = JSON.parse(String(init?.body));
        if (request.api_name === "/book/bookmarklist") {
          return Response.json({ data: { updated: [], chapters: [] } });
        }
        return Response.json({ data: { reviews: [], hasMore: false } });
      })
    );

    await syncHighlights(
      database,
      createPreparedStatements(database),
      ["book-1"],
      now
    );
    const notes = database
      .prepare("SELECT source_id, content FROM reading_notes ORDER BY source_id")
      .all();
    database.close();

    expect(notes).toEqual([{ source_id: "manual:note-1", content: "my reflection" }]);
  });
});

describe("WeRead rating migration", () => {
  it("repairs only oversized WeRead ratings", () => {
    const database = new Database(":memory:");
    database.exec(
      "CREATE TABLE reading_books (source TEXT NOT NULL, rating INTEGER);" +
        "INSERT INTO reading_books VALUES ('weread_book', 462);" +
        "INSERT INTO reading_books VALUES ('weread_book', 44);" +
        "INSERT INTO reading_books VALUES ('manual', 462);"
    );
    database.exec(
      fs.readFileSync(
        path.join(
          process.cwd(),
          "src/lib/db/migrations/0002_fix_weread_rating_scale.sql"
        ),
        "utf8"
      )
    );
    const rows = database
      .prepare("SELECT source, rating FROM reading_books ORDER BY rowid")
      .all();
    database.close();

    expect(rows).toEqual([
      { source: "weread_book", rating: 46 },
      { source: "weread_book", rating: 44 },
      { source: "manual", rating: 462 },
    ]);
  });
});
