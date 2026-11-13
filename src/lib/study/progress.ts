import { lessonSteps } from "./schema";

export interface LessonProgress {
  answers: Record<string, string>;
  completedSteps: string[];
  completedAt: string | null;
}
export const emptyProgress = (): LessonProgress => ({ answers: {}, completedSteps: [], completedAt: null });

export function canCompleteStep(lesson: { prequestions: { id: string }[]; selfExplain: { id: string }[]; retrieval: { id: string }[] }, step: string, answers: Record<string, string>) {
  if (!lessonSteps.some((value) => value === step)) return false;
  const questions = step === "prequestions" ? lesson.prequestions : step === "reflection" ? [...lesson.selfExplain, ...lesson.retrieval] : [];
  return questions.every((question) => Boolean(answers[question.id]?.trim()));
}

export function isLessonComplete(progress: LessonProgress) {
  return lessonSteps.every((step) => progress.completedSteps.includes(step));
}
