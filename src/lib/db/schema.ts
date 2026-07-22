import { index, sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  coverImage: text("cover_image"),
  status: text("status", { enum: ["draft", "published"] })
    .notNull()
    .default("draft"),
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  publishedAt: text("published_at"),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const postTags = sqliteTable("post_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
});

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  nickname: text("nickname").notNull(),
  email: text("email").notNull(),
  body: text("body").notNull(),
  approved: integer("approved", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const siteSettings = sqliteTable("site_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const readingBooks = sqliteTable("reading_books", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull().default("manual"),
  sourceId: text("source_id").notNull().unique(),
  title: text("title").notNull(),
  author: text("author").notNull().default(""),
  cover: text("cover"),
  category: text("category"),
  status: text("status", { enum: ["reading", "finished", "queued"] })
    .notNull()
    .default("queued"),
  progress: integer("progress").notNull().default(0),
  rating: integer("rating"),
  pages: integer("pages").notNull().default(0),
  year: integer("year"),
  wordCount: integer("word_count").notNull().default(0),
  noteCount: integer("note_count").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  bookmarkCount: integer("bookmark_count").notNull().default(0),
  readingSeconds: integer("reading_seconds").notNull().default(0),
  latestNote: text("latest_note"),
  deepLink: text("deep_link"),
  isPrivate: integer("is_private", { mode: "boolean" }).notNull().default(false),
  isTop: integer("is_top", { mode: "boolean" }).notNull().default(false),
  readUpdatedAt: text("read_updated_at"),
  finishedAt: text("finished_at"),
  archivedAt: text("archived_at"),
  rawPayload: text("raw_payload"),
  syncedAt: text("synced_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const readingNotes = sqliteTable("reading_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceId: text("source_id").notNull().unique(),
  bookSourceId: text("book_source_id")
    .notNull()
    .references(() => readingBooks.sourceId, { onDelete: "cascade" }),
  type: text("type", { enum: ["highlight", "review"] }).notNull(),
  content: text("content").notNull(),
  abstract: text("abstract"),
  chapterTitle: text("chapter_title"),
  createdAt: text("created_at"),
  rawPayload: text("raw_payload"),
  syncedAt: text("synced_at").notNull(),
});

export const readingSyncState = sqliteTable("reading_sync_state", {
  key: text("key").primaryKey(),
  status: text("status", { enum: ["success", "error", "running"] })
    .notNull()
    .default("success"),
  message: text("message"),
  totalBooks: integer("total_books").notNull().default(0),
  totalNotes: integer("total_notes").notNull().default(0),
  startedAt: text("started_at"),
  finishedAt: text("finished_at"),
  payload: text("payload"),
});

export const dailyEntries = sqliteTable(
  "daily_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    content: text("content").notNull(),
    images: text("images").notNull().default("[]"),
    location: text("location"),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
    occurredAt: text("occurred_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    publishedAt: text("published_at"),
  },
  (table) => [
    index("daily_entries_public_timeline_idx").on(table.status, table.isPinned, table.occurredAt),
  ]
);
