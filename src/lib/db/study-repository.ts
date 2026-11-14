import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "./client";
import { lessons, exercises, lessonProgress, attempts, submissions } from "./schema";
import { LessonSchema, ExerciseSchema, AnswerSchema } from "../study/schema";
import { emptyProgress } from "../study/progress";
import type { StudyRepository, StudyOperations, Attempt } from "../study/repository";
import { writeTransaction } from "./transaction";

type Connection = Pick<Database, "query" | "select" | "insert" | "update">;

function operations(db: Connection): StudyOperations {
  async function findAttempt(id: string): Promise<Attempt | null> {
    const row = await db.query.attempts.findFirst({ where: eq(attempts.id, id) });
    if (!row) return null;
    const answers = await db.query.submissions.findMany({ where: eq(submissions.attemptId, id), orderBy: asc(sql`rowid`) });
    return {
      ...row,
      revealedHintCount: row.revealedHintCount ?? 0,
      selfAssessment: row.selfAssessment ?? null,
      submissions: answers.map((answer) => ({ ...answer, answer: AnswerSchema.parse(answer.answer) })),
    };
  }
  return {
    async listLessons() { return (await db.query.lessons.findMany({ orderBy: desc(lessons.version) })).map((row) => LessonSchema.parse(row.definition)); },
    async findLessonByTopic(topicId, version) {
      const row = await db.query.lessons.findFirst({ where: version === undefined ? eq(lessons.topicId, topicId) : and(eq(lessons.topicId, topicId), eq(lessons.version, version)), orderBy: desc(lessons.version) });
      return row ? LessonSchema.parse(row.definition) : null;
    },
    async findLesson(id) { const row = await db.query.lessons.findFirst({ where: eq(lessons.id, id) }); return row ? LessonSchema.parse(row.definition) : null; },
    async listExercises(lessonId) { return (await db.query.exercises.findMany({ where: eq(exercises.lessonId, lessonId), orderBy: asc(exercises.orderIndex) })).map((row) => ExerciseSchema.parse(row.definition)); },
    async findExercise(id) { const row = await db.query.exercises.findFirst({ where: eq(exercises.id, id) }); return row ? ExerciseSchema.parse(row.definition) : null; },
    async listAttemptedLessonIds(lessonIds) {
      if (!lessonIds.length) return [];
      const rows = await db
        .select({ lessonId: exercises.lessonId })
        .from(attempts)
        .innerJoin(exercises, eq(attempts.exerciseId, exercises.id))
        .where(inArray(exercises.lessonId, lessonIds))
        .groupBy(exercises.lessonId);
      return rows.map((row: { lessonId: string }) => row.lessonId);
    },
    async getProgress(lessonId) { return (await db.query.lessonProgress.findFirst({ where: eq(lessonProgress.lessonId, lessonId) }))?.progress ?? emptyProgress(); },
    async saveProgress(lessonId, progress) { await db.insert(lessonProgress).values({ lessonId, progress }).onConflictDoUpdate({ target: lessonProgress.lessonId, set: { progress } }); },
    findAttempt,
    async latestAttempt(exerciseId) {
      const row = await db.query.attempts.findFirst({ where: eq(attempts.exerciseId, exerciseId), orderBy: desc(sql`rowid`) });
      return row ? findAttempt(row.id) : null;
    },
    async hasSolved(exerciseId) { return Boolean(await db.query.attempts.findFirst({ where: and(eq(attempts.exerciseId, exerciseId), eq(attempts.isCorrect, true)) })); },
    async createAttempt({ submissions: ignored, revealedHintCount, selfAssessment, ...attempt }) {
      void ignored;
      await db.insert(attempts).values({
        ...attempt,
        revealedHintCount: revealedHintCount ?? 0,
        selfAssessment: selfAssessment ?? null,
      });
    },
    async saveAttempt(attempt) {
      await db
        .update(attempts)
        .set({
          closedAt: attempt.closedAt,
          isCorrect: attempt.isCorrect,
          gaveUp: attempt.gaveUp,
          revealedHintCount: attempt.revealedHintCount ?? 0,
          selfAssessment: attempt.selfAssessment ?? null,
        })
        .where(eq(attempts.id, attempt.id));
    },
    async findSubmission(requestId) { return await db.query.submissions.findFirst({ where: eq(submissions.requestId, requestId) }) ?? null; },
    async createSubmission(submission) { await db.insert(submissions).values(submission); },
  };
}

export function createSqliteStudyRepository(db: Database): StudyRepository {
  return { ...operations(db), transaction: (work) => writeTransaction(db, (tx) => work(operations(tx))) };
}
