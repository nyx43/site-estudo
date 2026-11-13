import "dotenv/config";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createDatabase } from "../src/lib/db/client";

const { db, client } = createDatabase();
try {
  await migrate(db, { migrationsFolder: "./db/migrations" });
  console.log("Migrações aplicadas sem redefinir o banco.");
} finally { client.close(); }
