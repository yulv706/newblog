const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const { drizzle } = require("drizzle-orm/better-sqlite3");
const { migrate } = require("drizzle-orm/better-sqlite3/migrator");

const databasePath = path.join(process.cwd(), "data", "blog.db");
const migrationsFolder = path.join(process.cwd(), "src", "lib", "db", "migrations");

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);

migrate(db, { migrationsFolder });

sqlite.close();
