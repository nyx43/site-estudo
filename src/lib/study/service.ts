import { randomUUID } from "node:crypto";
import { publicExercise, publicLesson } from "./public";
import { canCompleteStep, isLessonComplete, type LessonProgress } from "./progress";
import { lessonSteps, type Answer, type Exercise } from "./schema";
import type { Attempt, StudyRepository } from "./repository";
import { evaluate, InvalidAnswerError } from "../pedagogy/evaluator";

export class StudyError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const missing = () => new StudyError(404, "Conteúdo de estudo não encontrado.");

export type ExerciseProgressStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "SOLVED"
  | "SUBMITTED_FOR_REVIEW"
  | "SELF_ASSESSED"
  | "GAVE_UP";

export function canAccessExercise(
  exercise: Pick<Exercise, "allowDirectPractice">,
  progress: Pick<LessonProgress, "completedAt">,
) {
  return Boolean(progress.completedAt) || exercise.allowDirectPractice === true;
}

function formatStructuredSolution(exercise: Extract<Exercise, { type: "STRUCTURED_RESPONSE" }>) {
  const lines = exercise.groups.map((group) => {
    const parts = group.fields.map((field) => {
      const expected = exercise.solution.expected[`${group.id}.${field.id}`] ?? [];
      const labels = expected.map((val) =>
        field.kind === "select" ? (field.options.find((opt) => opt.value === val)?.label ?? String(val)) : String(val),
      );
      return `${field.label}: ${labels.join(" ou ")}`;
    });
    return `${group.label} -> ${parts.join(", ")}`;
  });
  if (exercise.notes?.length) {
    lines.push(...exercise.notes.map((note) => `${note.label}: ${note.sampleAnswer}`));
  }
  return lines.join("\n");
}

function solutionText(exercise: Exercise) {
  switch (exercise.type) {
    case "MISCONCEPTION_QUIZ": return exercise.options.find((option) => option.id === exercise.solution.optionId)!.text;
    case "PARSONS": return exercise.solution.orders[0].map((block) => `${"    ".repeat(block.indent)}${exercise.blocks.find((item) => item.id === block.id)!.code}`).join("\n");
    case "ERRONEOUS_EXAMPLE": return exercise.items.filter((item) => exercise.solution.faultyItemIds.includes(item.id)).map((item) => item.text).join("\n");
    case "PRIMM_PREDICT": return exercise.solution.output;
    case "STRUCTURED_RESPONSE": return formatStructuredSolution(exercise);
    case "OPEN_RESPONSE":
      return [
        ...exercise.solution.referenceSections.map((sec) => `${sec.label}:\n${sec.content}`),
        ...(exercise.solution.criticalFailureNote ? [`Atenção crítica: ${exercise.solution.criticalFailureNote}`] : []),
      ].join("\n\n");
  }
}

export function deriveAttemptStatus(exercise: Exercise, attempt: Attempt | null, solvedPreviously = false): ExerciseProgressStatus {
  if (exercise.type === "OPEN_RESPONSE") {
    if (!attempt) return "PENDING";
    if (!attempt.closedAt) return "IN_PROGRESS";
    if (attempt.gaveUp) return "GAVE_UP";
    if (attempt.selfAssessment) return "SELF_ASSESSED";
    if (attempt.submissions.length > 0) return "SUBMITTED_FOR_REVIEW";
    return "PENDING";
  }
  if (solvedPreviously || attempt?.isCorrect) return "SOLVED";
  if (!attempt) return "PENDING";
  if (attempt.gaveUp) return "GAVE_UP";
  return attempt.closedAt ? "PENDING" : "IN_PROGRESS";
}

function attemptView(attempt: Attempt, exercise: Exercise) {
  const last = attempt.submissions.at(-1);
  const revealedHintCount = attempt.revealedHintCount ?? 0;
  const revealedHints = exercise.hints ? exercise.hints.slice(0, revealedHintCount) : [];
  const attemptStatus = deriveAttemptStatus(exercise, attempt, attempt.isCorrect);
  const canSelfAssess = exercise.type === "OPEN_RESPONSE" && Boolean(attempt.closedAt) && !attempt.gaveUp && attempt.submissions.length > 0;
  return {
    id: attempt.id, exerciseId: attempt.exerciseId, createdAt: attempt.createdAt, closedAt: attempt.closedAt,
    isCorrect: attempt.isCorrect, gaveUp: attempt.gaveUp, attemptsCount: attempt.submissions.length,
    attemptStatus,
    revealedHintCount,
    revealedHints,
    selfAssessment: attempt.selfAssessment ?? null,
    solvedWithoutHelp: attempt.isCorrect && attempt.submissions.length === 1 && !attempt.gaveUp && revealedHintCount === 0,
    timeSpentSeconds: Math.max(0, Math.floor(((attempt.closedAt ? Date.parse(attempt.closedAt) : Date.now()) - Date.parse(attempt.createdAt)) / 1000)),
    ...(last ? { lastAnswer: last.answer, feedback: last.feedback } : {}),
    ...(attempt.closedAt ? {
      solutionText: solutionText(exercise),
      explanation: exercise.explanation,
      ...(exercise.type === "OPEN_RESPONSE" ? { openSolution: exercise.solution } : {}),
      ...(canSelfAssess && exercise.type === "OPEN_RESPONSE" ? { rubric: exercise.rubric } : {}),
    } : {}),
  };
}
export type AttemptView = ReturnType<typeof attemptView>;
export type ProgressChange = { action: "ANSWER"; questionId: string; answer: string } | { action: "COMPLETE_STEP"; step: typeof lessonSteps[number] };

export function createStudyService(repository: StudyRepository, clock = () => new Date(), uuid = randomUUID) {
  return {
    async availableLessons() {
      const lessons = await repository.listLessons();
      const topics = new Set<string>();
      return lessons.filter((lesson) => { if (topics.has(lesson.topicId)) return false; topics.add(lesson.topicId); return true; }).map(({ id, topicId, title, status, version, teaching, objectives }) => ({ id, topicId, title, status, version, description: teaching?.introduction[0] ?? objectives[0], level: teaching?.level ?? "FOUNDATION" }));
    },
    async lesson(topicId: string, version?: number) {
      const lesson = await repository.findLessonByTopic(topicId, version);
      if (!lesson) return null;
      const progress = await repository.getProgress(lesson.id);
      const exercises = await Promise.all((await repository.listExercises(lesson.id)).map(async (exercise) => {
        const attempt = await repository.latestAttempt(exercise.id);
        const isCorrect = exercise.type === "OPEN_RESPONSE" ? false : await repository.hasSolved(exercise.id);
        const status = deriveAttemptStatus(exercise, attempt, isCorrect);
        return {
          id: exercise.id,
          title: exercise.title,
          type: exercise.type,
          ...(exercise.layer ? { layer: exercise.layer } : {}),
          ...(exercise.scope ? { scope: exercise.scope } : {}),
          ...(exercise.allowDirectPractice ? { allowDirectPractice: true } : {}),
          accessible: canAccessExercise(exercise, progress),
          status,
          isCorrect,
          gaveUp: attempt?.gaveUp ?? false,
        };
      }));
      const topicLessons = (await repository.listLessons()).filter((item) => item.topicId === topicId);
      const attemptedLessons = new Set(await repository.listAttemptedLessonIds(topicLessons.map((item) => item.id)));
      const versions = await Promise.all(topicLessons.map(async (item) => {
        const saved = await repository.getProgress(item.id);
        const hasAttempts = attemptedLessons.has(item.id);
        return {
          id: item.id,
          version: item.version,
          hasProgress: saved.completedSteps.length > 0 || Object.keys(saved.answers).length > 0 || hasAttempts,
          hasAttempts,
          completedAt: saved.completedAt,
        };
      }));
      return { lesson: publicLesson(lesson, progress.answers, progress.completedSteps), progress, exercises, versions };
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
        const progress = await tx.getProgress(exercise.lessonId);
        if (!canAccessExercise(exercise, progress)) throw new StudyError(409, "Conclua a aula antes de iniciar a prática.");
        const existing = await tx.latestAttempt(exerciseId);
        if (existing && !existing.closedAt) return attemptView(existing, exercise);
        const attempt: Attempt = {
          id: uuid(),
          exerciseId,
          createdAt: clock().toISOString(),
          closedAt: null,
          isCorrect: false,
          gaveUp: false,
          revealedHintCount: 0,
          selfAssessment: null,
          submissions: [],
        };
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
        if (exercise.type === "OPEN_RESPONSE") {
          attempt.isCorrect = false;
          attempt.closedAt = clock().toISOString();
          await tx.saveAttempt(attempt);
        } else if (result.isCorrect) {
          attempt.isCorrect = true;
          attempt.closedAt = clock().toISOString();
          await tx.saveAttempt(attempt);
        }
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
    async revealHint(attemptId: string, hintNumber: number) {
      return repository.transaction(async (tx) => {
        const attempt = await tx.findAttempt(attemptId);
        if (!attempt) throw missing();
        const exercise = await tx.findExercise(attempt.exerciseId);
        if (!exercise) throw missing();
        const totalHints = exercise.hints?.length ?? 0;
        if (!Number.isInteger(hintNumber) || hintNumber < 1 || hintNumber > totalHints) {
          throw new StudyError(400, "Dica solicitada não existe nesta atividade.");
        }
        const current = attempt.revealedHintCount ?? 0;
        if (hintNumber <= current) return attemptView(attempt, exercise);
        if (attempt.closedAt) {
          throw new StudyError(409, "A tentativa já foi encerrada; não é possível revelar novas dicas.");
        }
        if (hintNumber !== current + 1) {
          throw new StudyError(409, "Revele as dicas na ordem, começando pela próxima disponível.");
        }
        attempt.revealedHintCount = hintNumber;
        await tx.saveAttempt(attempt);
        return attemptView(attempt, exercise);
      });
    },
    async saveSelfAssessment(attemptId: string, checkedCriterionIds: string[]) {
      return repository.transaction(async (tx) => {
        const attempt = await tx.findAttempt(attemptId);
        if (!attempt) throw missing();
        const exercise = await tx.findExercise(attempt.exerciseId);
        if (!exercise) throw missing();
        if (exercise.type !== "OPEN_RESPONSE") {
          throw new StudyError(409, "Autoavaliação por rubrica se aplica apenas a atividades abertas.");
        }
        if (!attempt.closedAt || attempt.gaveUp || attempt.submissions.length === 0) {
          throw new StudyError(409, "Envie sua resposta aberta antes de registrar a autoavaliação.");
        }
        const validIds = new Set(exercise.rubric.map((item) => item.id));
        if (
          new Set(checkedCriterionIds).size !== checkedCriterionIds.length ||
          checkedCriterionIds.some((id) => !validIds.has(id))
        ) {
          throw new StudyError(400, "Critérios de rubrica inválidos para esta atividade.");
        }
        attempt.selfAssessment = { checkedCriterionIds, updatedAt: clock().toISOString() };
        await tx.saveAttempt(attempt);
        return attemptView(attempt, exercise);
      });
    },
  };
}
export type LessonView = NonNullable<Awaited<ReturnType<ReturnType<typeof createStudyService>["lesson"]>>>;
