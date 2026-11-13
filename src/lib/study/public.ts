import type { Exercise, Lesson } from "./schema";

function publicQuestions(questions: Lesson["prequestions"], answers: Record<string, string>) {
  return questions.map(({ id, prompt, modelAnswer }) => ({ id, prompt, ...(answers[id]?.trim() ? { modelAnswer } : {}) }));
}

export function publicLesson(lesson: Lesson, answers: Record<string, string> = {}, completedSteps: string[] = []) {
  const { prequestions, selfExplain, retrieval, ...content } = lesson;
  return { ...content, prequestions: publicQuestions(prequestions, completedSteps.includes("efficiency") || completedSteps.includes("summary") ? answers : {}), selfExplain: publicQuestions(selfExplain, answers), retrieval: publicQuestions(retrieval, answers) };
}
export type PublicLesson = ReturnType<typeof publicLesson>;

export function publicExercise(exercise: Exercise) {
  const common = { id: exercise.id, lessonId: exercise.lessonId, topicId: exercise.topicId, title: exercise.title, prompt: exercise.prompt, difficulty: exercise.difficulty, type: exercise.type };
  switch (exercise.type) {
    case "MISCONCEPTION_QUIZ": return { ...common, type: exercise.type, options: exercise.options.map(({ id, text }) => ({ id, text })) };
    case "PARSONS": return { ...common, type: exercise.type, blocks: exercise.blocks.map(({ id, code }) => ({ id, code })) };
    case "ERRONEOUS_EXAMPLE": return { ...common, type: exercise.type, items: exercise.items };
    case "PRIMM_PREDICT": return { ...common, type: exercise.type, code: exercise.code };
  }
}
export type PublicExercise = ReturnType<typeof publicExercise>;
