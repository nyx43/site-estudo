import { z } from "zod";

const text = z.string().trim().min(1);
const code = z.string().min(1).max(8000).refine((value) => value.trim().length > 0, "Código vazio.");
const id = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const question = z.object({ id, prompt: text, modelAnswer: text }).strict();

export const lessonSteps = ["prequestions", "why", "mental-model", "concept", "worked-example", "misconceptions", "uses", "efficiency", "summary", "reflection"] as const;
export type LessonStep = typeof lessonSteps[number];

export const LessonSchema = z.object({
  id, topicId: id, version: z.number().int().positive(), title: text,
  status: z.enum(["DRAFT", "AUTO_CHECKED", "VERIFIED"]),
  objectives: z.array(text).min(2).max(5),
  prequestions: z.array(question).min(2).max(3),
  why: z.object({ problem: text, cost: text }).strict(),
  mentalModel: z.object({ analogy: text, limits: text, trace: z.object({ headers: z.array(text), rows: z.array(z.array(z.string())) }) }).strict(),
  concept: z.object({ definition: text, parts: z.array(text).min(2), code, expectedOutput: z.string() }).strict(),
  workedExamples: z.array(z.object({ problem: text, subgoals: z.array(z.object({ label: text, code, why: text }).strict()).min(2), expectedOutput: z.string() }).strict()).min(1),
  misconceptions: z.array(z.object({ tag: id, claim: text, refutation: text, correct: text }).strict()).min(1),
  uses: z.array(z.object({ context: text, description: text }).strict()).min(3).max(5),
  efficiency: z.object({ naive: code, better: code, criterion: text, expectedOutput: z.string() }).strict(),
  summary: text,
  selfExplain: z.array(question).min(1).max(2),
  retrieval: z.array(question).min(3).max(4),
}).strict().superRefine((lesson, ctx) => {
  const ids = [...lesson.prequestions, ...lesson.selfExplain, ...lesson.retrieval].map((item) => item.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "IDs de perguntas duplicados." });
});

const common = { id, lessonId: id, topicId: id, title: text, prompt: text, difficulty: z.number().int().min(1).max(3), skills: z.array(text).min(1), explanation: text };
const order = z.array(z.object({ id, indent: z.number().int().min(0).max(3) }).strict()).min(1).max(12);

export const ExerciseSchema = z.discriminatedUnion("type", [
  z.object({ ...common, type: z.literal("MISCONCEPTION_QUIZ"), options: z.array(z.object({ id, text, misconceptionTag: id.optional(), feedback: text }).strict()).min(2), solution: z.object({ optionId: id }).strict() }).strict(),
  z.object({ ...common, type: z.literal("PARSONS"), blocks: z.array(z.object({ id, code: text, distractor: z.boolean() }).strict()).min(3).max(12), solution: z.object({ orders: z.array(order).min(1), output: z.string() }).strict() }).strict(),
  z.object({ ...common, type: z.literal("ERRONEOUS_EXAMPLE"), items: z.array(z.object({ id, text }).strict()).min(2), solution: z.object({ faultyItemIds: z.array(id).min(1) }).strict() }).strict(),
  z.object({ ...common, type: z.literal("PRIMM_PREDICT"), code: text, solution: z.object({ output: z.string() }).strict() }).strict(),
]).superRefine((exercise, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: "custom", message });
  if (exercise.type === "MISCONCEPTION_QUIZ") {
    if (new Set(exercise.options.map((option) => option.id)).size !== exercise.options.length) fail("Alternativas duplicadas.");
    if (!exercise.options.some((option) => option.id === exercise.solution.optionId)) fail("Gabarito de quiz inexistente.");
  } else if (exercise.type === "PARSONS") {
    const valid = exercise.blocks.filter((block) => !block.distractor).map((block) => block.id);
    if (new Set(exercise.blocks.map((block) => block.id)).size !== exercise.blocks.length) fail("Blocos duplicados.");
    for (const candidate of exercise.solution.orders) {
      const ids = candidate.map((block) => block.id);
      if (ids.length !== valid.length || new Set(ids).size !== ids.length || ids.some((value) => !valid.includes(value))) fail("Solução Parsons inconsistente.");
    }
  } else if (exercise.type === "ERRONEOUS_EXAMPLE") {
    const ids = exercise.items.map((item) => item.id);
    if (new Set(ids).size !== ids.length || new Set(exercise.solution.faultyItemIds).size !== exercise.solution.faultyItemIds.length || exercise.solution.faultyItemIds.some((value) => !ids.includes(value))) fail("Itens ou gabarito inconsistentes.");
  }
});

export const AnswerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("MISCONCEPTION_QUIZ"), optionId: id }).strict(),
  z.object({ type: z.literal("PARSONS"), order }).strict(),
  z.object({ type: z.literal("ERRONEOUS_EXAMPLE"), itemIds: z.array(id).min(1).max(20) }).strict(),
  z.object({ type: z.literal("PRIMM_PREDICT"), output: z.string().max(2000) }).strict(),
]);

export const StudySeedSchema = z.object({ schemaVersion: z.literal(1), lesson: LessonSchema, exercises: z.array(ExerciseSchema).min(1) }).strict().superRefine((seed, ctx) => {
  const ids = new Set<string>();
  for (const exercise of seed.exercises) {
    if (exercise.lessonId !== seed.lesson.id || exercise.topicId !== seed.lesson.topicId || ids.has(exercise.id)) ctx.addIssue({ code: "custom", message: "Exercício com referência inválida ou ID duplicado." });
    ids.add(exercise.id);
  }
});
export type Lesson = z.infer<typeof LessonSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type Answer = z.infer<typeof AnswerSchema>;
export type StudySeed = z.infer<typeof StudySeedSchema>;
