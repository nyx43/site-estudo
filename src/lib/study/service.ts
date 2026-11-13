import { randomUUID } from "node:crypto";
import { publicExercise, publicLesson } from "./public";
import { canCompleteStep, isLessonComplete } from "./progress";
import { lessonSteps, type Answer, type Exercise } from "./schema";
import type { Attempt, StudyRepository } from "./repository";
import { evaluate, InvalidAnswerError } from "../pedagogy/evaluator";

export class StudyError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const missing = () => new StudyError(404, "Conteúdo de estudo não encontrado.");

function solutionText(exercise: Exercise) {
  switch (exercise.type) {
    case "MISCONCEPTION_QUIZ": return exercise.options.find((option) => option.id === exercise.solution.optionId)!.text;
    case "PARSONS": return exercise.solution.orders[0].map((block) => `${"    ".repeat(block.indent)}${exercise.blocks.find((item) => item.id === block.id)!.code}`).join("\n");
    case "ERRONEOUS_EXAMPLE": return exercise.items.filter((item) => exercise.solution.faultyItemIds.includes(item.id)).map((item) => item.text).join("\n");
    case "PRIMM_PREDICT": return exercise.solution.output;
  }
}

function attemptView(attempt: Attempt, exercise: Exercise) {
  const last = attempt.submissions.at(-1);
  return {
    id: attempt.id, exerciseId: attempt.exerciseId, createdAt: attempt.createdAt, closedAt: attempt.closedAt,
    isCorrect: attempt.isCorrect, gaveUp: attempt.gaveUp, attemptsCount: attempt.submissions.length,
    solvedWithoutHelp: attempt.isCorrect && attempt.submissions.length === 1 && !attempt.gaveUp,
    timeSpentSeconds: Math.max(0, Math.floor(((attempt.closedAt ? Date.parse(attempt.closedAt) : Date.now()) - Date.parse(attempt.createdAt)) / 1000)),
    ...(last ? { lastAnswer: last.answer, feedback: last.feedback } : {}),
    ...(attempt.closedAt ? { solutionText: solutionText(exercise), explanation: exercise.explanation } : {}),
  };
}
export type AttemptView = ReturnType<typeof attemptView>;
export type ProgressChange = { action: "ANSWER"; questionId: string; answer: string } | { action: "COMPLETE_STEP"; step: typeof lessonSteps[number] };

export function createStudyService(repository: StudyRepository, clock = () => new Date(), uuid = randomUUID) {
  return {
    async availableLessons() {
      const lessons = await repository.listLessons();
      const topics = new Set<string>();
      return lessons.filter((lesson) => { if (topics.has(lesson.topicId)) return false; topics.add(lesson.topicId); return true; }).map(({ id, topicId, title, status }) => ({ id, topicId, title, status }));
    },
    async lesson(topicId: string) {
      const lesson = await repository.findLessonByTopic(topicId);
      if (!lesson) return null;
      const progress = await repository.getProgress(lesson.id);
      const exercises = await Promise.all((await repository.listExercises(lesson.id)).map(async (exercise) => {
        const attempt = await repository.latestAttempt(exercise.id);
        return { id: exercise.id, title: exercise.title, type: exercise.type, isCorrect: await repository.hasSolved(exercise.id), gaveUp: attempt?.gaveUp ?? false };
      }));
      return { lesson: publicLesson(lesson, progress.answers, progress.completedSteps), progress, exercises };
    },
    async progress(lessonId: string, change: ProgressChange) {
      return repository.transaction(async (tx) => {
        const lesson = await tx.findLesson(lessonId);
        if (!lesson) throw missing();
        const progress = await tx.getProgress(lessonId);
        if (change.action === "ANSWER") {
          if (!change.answer.trim() || change.answer.length > 2000) throw new StudyError(400, "Escreva uma resposta entre 1 e 2000 caracteres.");
          if (![...lesson.prequestions, ...lesson.selfExplain, ...lesson.retrieval].some((question) => question.id === change.questionId)) throw new StudyError(400, "Pergunta inexistente.");
          progress.answers = { ...progress.answers, [change.questionId]: change.answer.trim() };
        } else {
          const index = lessonSteps.indexOf(change.step);
          if (!canCompleteStep(lesson, change.step, progress.answers) || !lessonSteps.slice(0, index).every((step) => progress.completedSteps.includes(step))) throw new StudyError(409, "Responda às perguntas e conclua as partes anteriores antes de continuar.");
          progress.completedSteps = [...new Set([...progress.completedSteps, change.step])];
          if (isLessonComplete(progress)) progress.completedAt ??= clock().toISOString();
        }
        await tx.saveProgress(lessonId, progress);
        return { lesson: publicLesson(lesson, progress.answers, progress.completedSteps), progress };
      });
    },
    async exercise(id: string) {
      const exercise = await repository.findExercise(id);
      if (!exercise) return null;
      const attempt = await repository.latestAttempt(id);
      return { exercise: publicExercise(exercise), attempt: attempt ? attemptView(attempt, exercise) : null };
    },
    async start(exerciseId: string) {
      return repository.transaction(async (tx) => {
        const exercise = await tx.findExercise(exerciseId);
        if (!exercise) throw missing();
        if (!(await tx.getProgress(exercise.lessonId)).completedAt) throw new StudyError(409, "Conclua a aula antes de iniciar a prática.");
        const existing = await tx.latestAttempt(exerciseId);
        if (existing && !existing.closedAt) return attemptView(existing, exercise);
        const attempt: Attempt = { id: uuid(), exerciseId, createdAt: clock().toISOString(), closedAt: null, isCorrect: false, gaveUp: false, submissions: [] };
        await tx.createAttempt(attempt);
        return attemptView(attempt, exercise);
      });
    },
    async submit(attemptId: string, requestId: string, answer: Answer) {
      return repository.transaction(async (tx) => {
        const attempt = await tx.findAttempt(attemptId);
        if (!attempt) throw missing();
        const exercise = await tx.findExercise(attempt.exerciseId);
        if (!exercise) throw missing();
        const replay = await tx.findSubmission(requestId);
        if (replay) {
          if (replay.attemptId !== attemptId || JSON.stringify(replay.answer) !== JSON.stringify(answer)) throw new StudyError(409, "Identificador de envio já utilizado com outra resposta.");
          return attemptView(attempt, exercise);
        }
        if (attempt.closedAt) throw new StudyError(409, "Esta tentativa já foi encerrada. Inicie uma nova para praticar novamente.");
        let result;
        try { result = evaluate(exercise, answer); } catch (error) {
          if (error instanceof InvalidAnswerError) throw new StudyError(400, error.message);
          throw error;
        }
        const submission = { requestId, attemptId, answer, ...result, createdAt: clock().toISOString() };
        await tx.createSubmission(submission);
        attempt.submissions.push(submission);
        if (result.isCorrect) { attempt.isCorrect = true; attempt.closedAt = clock().toISOString(); await tx.saveAttempt(attempt); }
        return attemptView(attempt, exercise);
      });
    },
    async giveUp(attemptId: string) {
      return repository.transaction(async (tx) => {
        const attempt = await tx.findAttempt(attemptId);
        if (!attempt) throw missing();
        const exercise = await tx.findExercise(attempt.exerciseId);
        if (!exercise) throw missing();
        if (!attempt.closedAt) { attempt.gaveUp = true; attempt.closedAt = clock().toISOString(); await tx.saveAttempt(attempt); }
        return attemptView(attempt, exercise);
      });
    },
  };
}
export type LessonView = NonNullable<Awaited<ReturnType<ReturnType<typeof createStudyService>["lesson"]>>>;
