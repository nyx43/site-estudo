import { eq } from "drizzle-orm";
import type { Database } from "./client";
import { lessons, exercises, lessonProgress, attempts } from "./schema";
import { StudySeedSchema, type StudySeed } from "../study/schema";
import { writeTransaction } from "./transaction";

export async function seedStudy(db: Database, input: StudySeed[]) {
  const seeds = input.map((value) => StudySeedSchema.parse(value));
  await writeTransaction(db, async (tx) => {
    for (const seed of seeds) {
      const existingLesson = await tx.query.lessons.findFirst({ where: eq(lessons.id, seed.lesson.id) });
      const used = await tx.query.lessonProgress.findFirst({ where: eq(lessonProgress.lessonId, seed.lesson.id) });
      if (existingLesson && JSON.stringify(existingLesson.definition) !== JSON.stringify(seed.lesson) && (used || existingLesson.definition.status === "VERIFIED")) throw new Error("Aula em uso é imutável: crie uma nova versão.");
      await tx.insert(lessons).values({ id: seed.lesson.id, topicId: seed.lesson.topicId, version: seed.lesson.version, definition: seed.lesson }).onConflictDoUpdate({ target: lessons.id, set: { definition: seed.lesson } });
      for (const [orderIndex, exercise] of seed.exercises.entries()) {
        const existing = await tx.query.exercises.findFirst({ where: eq(exercises.id, exercise.id) });
        const attempted = await tx.query.attempts.findFirst({ where: eq(attempts.exerciseId, exercise.id) });
        if (existing && JSON.stringify(existing.definition) !== JSON.stringify(exercise) && attempted) throw new Error("Exercício em uso é imutável: crie uma nova versão.");
        await tx.insert(exercises).values({ id: exercise.id, lessonId: seed.lesson.id, orderIndex, definition: exercise }).onConflictDoUpdate({ target: exercises.id, set: { definition: exercise, orderIndex } });
      }
    }
  });
}
