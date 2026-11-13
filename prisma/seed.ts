import { PrismaClient } from "@prisma/client";
import { loadCurriculum } from "../src/lib/content/load-curriculum";
import { seedCatalog } from "../src/lib/db/seed-catalog";

const client = new PrismaClient();

async function main() {
  await seedCatalog(client, await loadCurriculum());
  console.log("Currículo salvo. Nenhum registro local foi removido.");
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(() => client.$disconnect());
