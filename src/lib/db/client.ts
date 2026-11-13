import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as schema from "./schema";

export function createDatabase(url = process.env.DATABASE_URL ?? "file:./data/estudo.db") {
  if (!url.startsWith("file:")) throw new Error("Esta versão usa SQLite local: DATABASE_URL deve começar com file:.");
  const filename = path.resolve(url.slice(5));
  mkdirSync(path.dirname(filename), { recursive: true });
  const client = createClient({ url: pathToFileURL(filename).href });
  return { db: drizzle(client, { schema }), client };
}

export type Database = ReturnType<typeof createDatabase>["db"];
const globalForDb = globalThis as unknown as { studyDatabase?: ReturnType<typeof createDatabase> };

export function getDatabase() {
  globalForDb.studyDatabase ??= createDatabase();
  return globalForDb.studyDatabase.db;
}
