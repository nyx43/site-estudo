import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "turso", schema: "./src/lib/db/schema.ts", out: "./db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "file:./data/estudo.db" },
});
