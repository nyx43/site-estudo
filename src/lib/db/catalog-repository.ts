import { asc, eq, type SQL } from "drizzle-orm";
import { AcademicTrackSchema, ModuleGuideSchema, SubjectLifecycleStatusSchema, SubjectSchema, TopicPlanSchema } from "../catalog/schema";
import type { CatalogRepository, CatalogSubject } from "../catalog/types";
import type { Database } from "./client";
import { subjects, modules, topics } from "./schema";

function loadSubjects(db: Database, where?: SQL) {
  return db.query.subjects.findMany({
    where, orderBy: [asc(subjects.orderIndex), asc(subjects.id)],
    with: { modules: { orderBy: [asc(modules.orderIndex), asc(modules.id)], with: { topics: { orderBy: [asc(topics.orderIndex), asc(topics.id)] } } } },
  });
}
type SubjectRow = Awaited<ReturnType<typeof loadSubjects>>[number];

function toSubject(row: SubjectRow): CatalogSubject {
  return {
    id: row.id, slug: row.slug, name: row.name, description: row.description,
    category: SubjectSchema.shape.category.parse(row.category), accent: SubjectSchema.shape.accent.parse(row.accent),
    lifecycleStatus: SubjectLifecycleStatusSchema.parse(row.lifecycleStatus),
    ...(row.academicTrack ? { academicTrack: AcademicTrackSchema.parse(row.academicTrack) } : {}),
    version: row.version, learningOutcomes: SubjectSchema.shape.learningOutcomes.parse(row.learningOutcomes),
    ...(row.overview ? { overview: SubjectSchema.shape.overview.unwrap().parse(row.overview) } : {}),
    modules: row.modules.map((item) => ({
      id: item.id, slug: item.slug, title: item.title, description: item.description,
      project: SubjectSchema.shape.modules.element.shape.project.parse(item.project),
      ...(item.guide ? { guide: ModuleGuideSchema.parse(item.guide) } : {}),
      topics: item.topics.map((topic) => ({ id: topic.id, slug: topic.slug, title: topic.title, summary: topic.summary, plan: TopicPlanSchema.parse(topic.plan) })),
    })),
  };
}

export function createSqliteCatalogRepository(db: Database): CatalogRepository {
  return {
    async listSubjects() { return (await loadSubjects(db)).map(toSubject); },
    async findSubject(slug) { const [row] = await loadSubjects(db, eq(subjects.slug, slug)); return row ? toSubject(row) : null; },
    async findTopic(id) {
      const row = await db.query.topics.findFirst({ where: eq(topics.id, id), with: { module: true } });
      if (!row) return null;
      const [subjectRow] = await loadSubjects(db, eq(subjects.id, row.module.subjectId));
      if (!subjectRow) return null;
      const subject = toSubject(subjectRow);
      const curriculumModule = subject.modules.find((item) => item.id === row.moduleId);
      const topic = curriculumModule?.topics.find((item) => item.id === id);
      return curriculumModule && topic ? { subject, module: curriculumModule, topic } : null;
    },
  };
}
