import { validateCurriculum } from "../catalog/schema";
import type { Database } from "./client";
import { subjects, modules, topics } from "./schema";
import { writeTransaction } from "./transaction";

/** Validate first, then update atomically without deleting local content or progress. */
export async function seedCatalog(db: Database, input: unknown[]) {
  const definitions = validateCurriculum(input);
  await writeTransaction(db, async (tx) => {
    for (const subject of definitions) {
      const data = {
        id: subject.slug, slug: subject.slug, name: subject.name, description: subject.description,
        category: subject.category, accent: subject.accent, version: subject.version,
        learningOutcomes: subject.learningOutcomes, orderIndex: subject.orderIndex,
        overview: subject.overview ?? null,
      };
      await tx.insert(subjects).values(data).onConflictDoUpdate({ target: subjects.id, set: data });
      for (const [moduleIndex, item] of subject.modules.entries()) {
        const moduleData = {
          id: `${subject.slug}.${item.slug}`, slug: item.slug, title: item.title, description: item.description,
          project: item.project, orderIndex: moduleIndex, subjectId: subject.slug,
          guide: item.guide ?? null,
        };
        await tx.insert(modules).values(moduleData).onConflictDoUpdate({ target: modules.id, set: moduleData });
        for (const [topicIndex, topic] of item.topics.entries()) {
          const topicData = { id: `${subject.slug}.${topic.slug}`, slug: topic.slug, title: topic.title, summary: topic.summary, plan: topic.plan, orderIndex: topicIndex, moduleId: moduleData.id };
          await tx.insert(topics).values(topicData).onConflictDoUpdate({ target: topics.id, set: topicData });
        }
      }
    }
  });
}
