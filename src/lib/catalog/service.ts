import type { CatalogRepository } from "./types";

/** Framework-free use cases: the web and future mobile API use the same contract. */
export function createCatalogService(repository: CatalogRepository) {
  return {
    listSubjects: () => repository.listSubjects(),
    findSubject: (slug: string) => repository.findSubject(slug),
    findTopic: (id: string) => repository.findTopic(id),
  };
}
