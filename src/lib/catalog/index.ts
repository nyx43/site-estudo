import { createFileCatalogRepository } from "../content/catalog-repository";
import { createCatalogService } from "./service";

// Composition root. Only this file chooses the persistence adapter.
async function resolveRepository() {
  if (process.env.CATALOG_STORAGE === "files") return createFileCatalogRepository();
  if (process.env.CATALOG_STORAGE && process.env.CATALOG_STORAGE !== "prisma") {
    throw new Error("CATALOG_STORAGE deve ser prisma ou files.");
  }
  const [{ prisma }, { createPrismaCatalogRepository }] = await Promise.all([
    import("../db/client"), import("../db/catalog-repository"),
  ]);
  return createPrismaCatalogRepository(prisma);
}

export const catalog = createCatalogService({
  listSubjects: async () => (await resolveRepository()).listSubjects(),
  findSubject: async (slug) => (await resolveRepository()).findSubject(slug),
  findTopic: async (id) => (await resolveRepository()).findTopic(id),
});
