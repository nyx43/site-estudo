import type { PrismaClient } from "@prisma/client";
import { validateCurriculum } from "../catalog/schema";

/** Atomic and additive: rerunning updates the curriculum without deleting local data. */
export async function seedCatalog(client: PrismaClient, input: unknown[]) {
  const subjects = validateCurriculum(input);
  await client.$transaction(async (tx) => {
    for (const subject of subjects) {
      const data = {
        slug: subject.slug, name: subject.name, description: subject.description,
        category: subject.category, accent: subject.accent, version: subject.version,
        learningOutcomes: subject.learningOutcomes, orderIndex: subject.orderIndex,
      };
      await tx.subject.upsert({ where: { id: subject.slug }, create: { id: subject.slug, ...data }, update: data });
      for (const [moduleIndex, module] of subject.modules.entries()) {
        const id = `${subject.slug}.${module.slug}`;
        const moduleData = {
          slug: module.slug, title: module.title, description: module.description,
          project: module.project, orderIndex: moduleIndex, subjectId: subject.slug,
        };
        await tx.module.upsert({ where: { id }, create: { id, ...moduleData }, update: moduleData });
        for (const [topicIndex, topic] of module.topics.entries()) {
          const topicId = `${subject.slug}.${topic.slug}`;
          const topicData = {
            slug: topic.slug, title: topic.title, summary: topic.summary,
            plan: topic.plan, orderIndex: topicIndex, moduleId: id,
          };
          await tx.topic.upsert({ where: { id: topicId }, create: { id: topicId, ...topicData }, update: topicData });
        }
      }
    }
  }, { timeout: 30000 });
}
