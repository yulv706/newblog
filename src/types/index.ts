import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
  posts,
  categories,
  tags,
  postTags,
  comments,
  siteSettings,
  readingBooks,
  readingNotes,
  readingSyncState,
} from "@/lib/db/schema";

export type Post = InferSelectModel<typeof posts>;
export type NewPost = InferInsertModel<typeof posts>;

export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;

export type Tag = InferSelectModel<typeof tags>;
export type NewTag = InferInsertModel<typeof tags>;

export type PostTag = InferSelectModel<typeof postTags>;
export type NewPostTag = InferInsertModel<typeof postTags>;

export type Comment = InferSelectModel<typeof comments>;
export type NewComment = InferInsertModel<typeof comments>;

export type SiteSetting = InferSelectModel<typeof siteSettings>;
export type NewSiteSetting = InferInsertModel<typeof siteSettings>;

export type ReadingBookRecord = InferSelectModel<typeof readingBooks>;
export type NewReadingBookRecord = InferInsertModel<typeof readingBooks>;

export type ReadingNoteRecord = InferSelectModel<typeof readingNotes>;
export type NewReadingNoteRecord = InferInsertModel<typeof readingNotes>;

export type ReadingSyncState = InferSelectModel<typeof readingSyncState>;
export type NewReadingSyncState = InferInsertModel<typeof readingSyncState>;
