import type { Prisma, PrismaClient } from "@prisma/client";
import { SubjectSchema, TopicPlanSchema } from "../catalog/schema";
import type { CatalogRepository, CatalogSubject } from "../catalog/types";

const include = {
  modules: {
    orderBy: [{ orderIndex: "asc" as const }, { id: "asc" as const }],
    include: { topics: { orderBy: [{ orderIndex: "asc" as const }, { id: "asc" as const }] } },
  },
} satisfies Prisma.SubjectInclude;

type SubjectRow = Prisma.SubjectGetPayload<{ include: typeof include }>;

function toSubject(row: SubjectRow): CatalogSubject {
  return {
    id: row.id, slug: row.slug, name: row.name, description: row.description,
    category: SubjectSchema.shape.category.parse(row.category),
    accent: SubjectSchema.shape.accent.parse(row.accent),
    version: row.version,
    learningOutcomes: SubjectSchema.shape.learningOutcomes.parse(row.learningOutcomes),
    modules: row.modules.map((module) => ({
      id: module.id, slug: module.slug, title: module.title, description: module.description,
      project: SubjectSchema.shape.modules.element.shape.project.parse(module.project),
      topics: module.topics.map((topic) => ({
        id: topic.id, slug: topic.slug, title: topic.title, summary: topic.summary,
        plan: TopicPlanSchema.parse(topic.plan),
      })),
    })),
  };
}

export function createPrismaCatalogRepository(client: PrismaClient): CatalogRepository {
  return {
    async listSubjects() {
      const rows = await client.subject.findMany({ include, orderBy: [{ orderIndex: "asc" }, { id: "asc" }] });
      return rows.map(toSubject);
    },
    async findSubject(slug) {
      const row = await client.subject.findUnique({ where: { slug }, include });
      return row ? toSubject(row) : null;
    },
    async findTopic(id) {
      const row = await client.topic.findUnique({ where: { id }, include: { module: { select: { subjectId: true } } } });
      if (!row) return null;
      const subjectRow = await client.subject.findUnique({ where: { id: row.module.subjectId }, include });
      if (!subjectRow) return null;
      const subject = toSubject(subjectRow);
      const curriculumModule = subject.modules.find((item) => item.id === row.moduleId);
      const topic = curriculumModule?.topics.find((item) => item.id === id);
      return curriculumModule && topic ? { subject, module: curriculumModule, topic } : null;
    },
  };
}
