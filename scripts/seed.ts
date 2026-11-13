import "dotenv/config";
import { createDatabase } from "../src/lib/db/client";
import { loadCurriculum } from "../src/lib/content/load-curriculum";
import { seedCatalog } from "../src/lib/db/seed-catalog";
import { seedStudy } from "../src/lib/db/seed-study";
import { loadStudy } from "../src/lib/content/load-study";

const { db, client } = createDatabase();
try {
  await seedCatalog(db, await loadCurriculum());
  await seedStudy(db, await loadStudy());
  console.log("Currículo salvo. Nenhum registro local foi removido.");
} finally { client.close(); }
