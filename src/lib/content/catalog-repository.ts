import type { CatalogRepository, CatalogSubject } from "../catalog/types";
import { loadCurriculum } from "./load-curriculum";

/** Explicit read-only preview for curriculum authors. Never a silent DB fallback. */
export function createFileCatalogRepository(): CatalogRepository {
  async function listSubjects(): Promise<CatalogSubject[]> {
    const definitions = await loadCurriculum();
    return definitions.map((subject) => ({
      id: subject.slug, slug: subject.slug, name: subject.name, description: subject.description,
      category: subject.category, accent: subject.accent, version: subject.version,
      learningOutcomes: subject.learningOutcomes,
      modules: subject.modules.map((curriculumModule) => ({
        id: `${subject.slug}.${curriculumModule.slug}`,
        slug: curriculumModule.slug, title: curriculumModule.title, description: curriculumModule.description,
        project: curriculumModule.project,
        topics: curriculumModule.topics.map((topic) => ({ id: `${subject.slug}.${topic.slug}`, ...topic })),
      })),
    }));
  }
  return {
    listSubjects,
    async findSubject(slug) {
      return (await listSubjects()).find((subject) => subject.slug === slug) ?? null;
    },
    async findTopic(id) {
      for (const subject of await listSubjects()) {
        for (const curriculumModule of subject.modules) {
          const topic = curriculumModule.topics.find((item) => item.id === id);
          if (topic) return { subject, module: curriculumModule, topic };
        }
      }
      return null;
    },
  };
}
