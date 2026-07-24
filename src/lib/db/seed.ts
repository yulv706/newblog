import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import * as schema from "./schema";

const DB_PATH = path.join(process.cwd(), "data", "blog.db");

async function seed() {
  console.log("🌱 Seeding database...");

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });

  // Clear existing data (order matters for foreign keys).
  db.delete(schema.postTags).run();
  db.delete(schema.comments).run();
  db.delete(schema.posts).run();
  db.delete(schema.categories).run();
  db.delete(schema.tags).run();
  db.delete(schema.siteSettings).run();

  db.insert(schema.siteSettings)
    .values({
      key: "about_content",
      value: `# 关于

你好，欢迎来到读写札记。
这里记录生活中的点滴，分享所思所想。

## 联系方式

如有想法交流，欢迎通过邮件联系。`,
    })
    .run();

  console.log("✅ Seeded about content");
  console.log(
    "ℹ️  No sample posts, categories, tags, or comments were seeded. The blog starts empty."
  );
  console.log("🎉 Seed completed successfully!");

  sqlite.close();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
