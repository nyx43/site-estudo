import { z } from "zod";

const text = z.string().trim().min(1);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const reference = z.string().regex(/^[a-z0-9-]+\.[a-z0-9-]+$/);

export const TopicPlanSchema = z.object({
  status: z.literal("PLANNED"),
  objectives: z.array(text).min(2),
  prerequisites: z.array(reference),
  lessonOutline: z.array(text).min(3),
  misconceptions: z.array(text).min(1),
  activities: z.array(z.object({
    type: z.enum(["MISCONCEPTION_QUIZ", "PARSONS", "ERRONEOUS_EXAMPLE", "PRIMM_PREDICT", "TRANSFER_CHALLENGE"]),
    description: text,
  }).strict()).min(1),
  acceptanceCriteria: z.array(text).min(2),
}).strict();

export const TopicSchema = z.object({
  slug,
  title: text,
  summary: text,
  plan: TopicPlanSchema,
}).strict();

export const SubjectSchema = z.object({
  schemaVersion: z.literal(1),
  version: z.number().int().positive(),
  orderIndex: z.number().int().nonnegative(),
  slug,
  name: text,
  description: text,
  category: z.enum(["PROGRAMMING", "THEORETICAL"]),
  accent: z.enum(["emerald", "amber", "rose", "blue", "violet"]),
  learningOutcomes: z.array(text).min(2),
  modules: z.array(z.object({
    slug,
    title: text,
    description: text,
    project: z.object({
      brief: text,
      deliverables: z.array(text).min(1),
      acceptanceCriteria: z.array(text).min(1),
    }).strict(),
    topics: z.array(TopicSchema).min(1),
  }).strict()).min(1),
}).strict();

export type SubjectDefinition = z.infer<typeof SubjectSchema>;
export type TopicPlan = z.infer<typeof TopicPlanSchema>;
export type SubjectCategory = SubjectDefinition["category"];
export type SubjectAccent = SubjectDefinition["accent"];

/** Validates references and cycles across the entire catalog, including future subjects. */
export function validateCurriculum(input: unknown[]): SubjectDefinition[] {
  const subjects = input.map((value) => SubjectSchema.parse(value));
  const ids = new Set<string>();
  const topicIds = new Set<string>();
  const graph = new Map<string, string[]>();

  for (const subject of subjects) {
    if (ids.has(subject.slug)) throw new Error(`Disciplina duplicada: ${subject.slug}`);
    ids.add(subject.slug);
    const moduleSlugs = new Set<string>();
    for (const curriculumModule of subject.modules) {
      if (moduleSlugs.has(curriculumModule.slug)) throw new Error(`Módulo duplicado: ${subject.slug}.${curriculumModule.slug}`);
      moduleSlugs.add(curriculumModule.slug);
      for (const topic of curriculumModule.topics) {
        const id = `${subject.slug}.${topic.slug}`;
        if (topicIds.has(id)) throw new Error(`Tópico duplicado: ${id}`);
        topicIds.add(id);
        graph.set(id, topic.plan.prerequisites);
      }
    }
  }

  for (const [id, dependencies] of graph) {
    if (new Set(dependencies).size !== dependencies.length) throw new Error(`Pré-requisito duplicado: ${id}`);
    for (const dependency of dependencies) {
      if (!topicIds.has(dependency)) throw new Error(`Pré-requisito inexistente: ${id} → ${dependency}`);
    }
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) throw new Error(`Ciclo de pré-requisitos: ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of graph.get(id) ?? []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of topicIds) visit(id);
  return subjects;
}
