import { z } from "zod";
import { TeachingSchema } from "./teaching-schema";

const text = z.string().trim().min(1);
const code = z.string().min(1).max(8000).refine((value) => value.trim().length > 0, "Código vazio.");
const id = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const keyId = id.max(128);
const compositeKeyId = id.max(256);
const question = z.object({ id, prompt: text, modelAnswer: text }).strict();

export const MAX_OPEN_RESPONSE_FIELDS = 6;
export const MAX_OPEN_FIELD_LENGTH = 4000;
export const MAX_STRUCTURED_FIELD_COUNT = 40;
export const MAX_STRUCTURED_NOTES = 3;
export const MAX_STRUCTURED_NOTE_LENGTH = 1500;
/** Guarantees any schema-valid Answer (including worst-case JSON control escapes in OPEN_RESPONSE) fits in submit body reads. */
export const MAX_SUBMIT_BODY_BYTES = MAX_OPEN_RESPONSE_FIELDS * (MAX_OPEN_FIELD_LENGTH * 6 + 136) + 4096;

export const exampleModes = ["PYTHON_SANDBOX", "STATIC_CODE", "CONCEPTUAL_ARTIFACT"] as const;
export type ExampleMode = typeof exampleModes[number];

export const studyLayers = ["C1", "C2", "C3"] as const;
export type StudyLayer = typeof studyLayers[number];

export const professionalScopes = ["JUNIOR", "PLENO", "SENIOR"] as const;
export type ProfessionalScope = typeof professionalScopes[number];

export const LessonLayerSectionSchema = z.object({
  id,
  layer: z.enum(studyLayers),
  title: text,
  summary: text,
  explanation: z.array(text).min(1),
  callout: z.object({ label: text, text }).strict().optional(),
  isComplementary: z.boolean().optional(),
}).strict();

export const lessonSteps = ["prequestions", "why", "mental-model", "concept", "worked-example", "misconceptions", "uses", "efficiency", "summary", "reflection"] as const;
export type LessonStep = typeof lessonSteps[number];

export const LessonSchema = z.object({
  id, topicId: id, version: z.number().int().positive(), title: text,
  status: z.enum(["DRAFT", "AUTO_CHECKED", "VERIFIED"]),
  exampleMode: z.enum(exampleModes).optional(),
  exampleLanguage: text.optional(),
  objectives: z.array(text).min(2).max(5),
  teaching: TeachingSchema.optional(),
  layerSections: z.array(LessonLayerSectionSchema).min(1).max(6).optional(),
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
  if (lesson.layerSections) {
    const sectionIds = lesson.layerSections.map((section) => section.id);
    if (new Set(sectionIds).size !== sectionIds.length) ctx.addIssue({ code: "custom", message: "IDs de seções por camada duplicados." });
  }
});

const common = {
  id,
  lessonId: id,
  topicId: id,
  title: text,
  prompt: text,
  difficulty: z.number().int().min(1).max(3),
  skills: z.array(text).min(1),
  explanation: text,
  layer: z.enum(studyLayers).optional(),
  scope: z.enum(professionalScopes).optional(),
  objective: text.optional(),
  context: text.optional(),
  prerequisites: z.array(text).min(1).max(6).optional(),
  lessonSection: id.optional(),
  allowDirectPractice: z.boolean().optional(),
  hints: z.array(text).min(1).max(3).optional(),
};
const order = z.array(z.object({ id, indent: z.number().int().min(0).max(3) }).strict()).min(1).max(12);
const structuredField = z.discriminatedUnion("kind", [
  z.object({ id, label: text, kind: z.literal("integer"), min: z.number().int().optional(), max: z.number().int().optional() }).strict(),
  z.object({ id, label: text, kind: z.literal("select"), options: z.array(z.object({ value: id, label: text }).strict()).min(2) }).strict(),
]);
const structuredGroup = z.object({ id, label: text, prompt: text.optional(), fields: z.array(structuredField).min(1).max(8) }).strict();
const structuredNote = z.object({ id, label: text, placeholder: text.optional(), sampleAnswer: text }).strict();
const openField = z.object({
  id: keyId, label: text, prompt: text.optional(), placeholder: text.optional(), multiline: z.boolean().optional(), isCode: z.boolean().optional(),
  minLength: z.number().int().min(1).max(500).optional(), maxLength: z.number().int().min(20).max(MAX_OPEN_FIELD_LENGTH).optional(),
}).strict();
const rubricItem = z.object({ id, label: text, description: text }).strict();

export const ExerciseSchema = z.discriminatedUnion("type", [
  z.object({ ...common, type: z.literal("MISCONCEPTION_QUIZ"), options: z.array(z.object({ id, text, misconceptionTag: id.optional(), feedback: text }).strict()).min(2), solution: z.object({ optionId: id }).strict() }).strict(),
  z.object({ ...common, type: z.literal("PARSONS"), blocks: z.array(z.object({ id, code: text, distractor: z.boolean() }).strict()).min(3).max(12), solution: z.object({ orders: z.array(order).min(1), output: z.string() }).strict() }).strict(),
  z.object({ ...common, type: z.literal("ERRONEOUS_EXAMPLE"), items: z.array(z.object({ id, text }).strict()).min(2), solution: z.object({ faultyItemIds: z.array(id).min(1) }).strict() }).strict(),
  z.object({ ...common, type: z.literal("PRIMM_PREDICT"), code: text, solution: z.object({ output: z.string() }).strict() }).strict(),
  z.object({
    ...common,
    type: z.literal("STRUCTURED_RESPONSE"),
    layout: z.enum(["TABLE", "CARDS"]).optional(),
    generalCriteria: z.array(text).min(1).max(6).optional(),
    groups: z.array(structuredGroup).min(1).max(12),
    notes: z.array(structuredNote).min(1).max(MAX_STRUCTURED_NOTES).optional(),
    solution: z.object({
      expected: z.record(z.string(), z.array(z.union([z.number().int(), id])).min(1)),
      fieldFeedback: z.record(z.string(), text).optional(),
      groupFeedback: z.record(z.string(), text).optional(),
    }).strict(),
  }).strict(),
  z.object({
    ...common,
    type: z.literal("OPEN_RESPONSE"),
    code: z.string().min(1).max(8000).refine((value) => value.trim().length > 0, "Código vazio.").optional(),
    codeLanguage: text.optional(),
    labTopicId: id.optional(),
    generalCriteria: z.array(text).min(2).max(6),
    fields: z.array(openField).min(1).max(MAX_OPEN_RESPONSE_FIELDS),
    rubric: z.array(rubricItem).min(2).max(8),
    solution: z.object({
      referenceSections: z.array(z.object({ label: text, content: text, isCode: z.boolean().optional() }).strict()).min(1),
      criticalFailureNote: text.optional(),
    }).strict(),
  }).strict(),
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
  } else if (exercise.type === "STRUCTURED_RESPONSE") {
    const groupIds = exercise.groups.map((group) => group.id);
    if (new Set(groupIds).size !== groupIds.length) fail("Grupos estruturados duplicados.");
    const fieldMap = new Map<string, z.infer<typeof structuredField>>();
    for (const group of exercise.groups) {
      const fIds = group.fields.map((field) => field.id);
      if (new Set(fIds).size !== fIds.length) fail(`Campos duplicados no grupo ${group.id}.`);
      for (const field of group.fields) {
        if (field.kind === "integer" && field.min !== undefined && field.max !== undefined && field.min > field.max) fail(`Intervalo inválido em ${group.id}.${field.id}.`);
        if (field.kind === "select" && new Set(field.options.map((opt) => opt.value)).size !== field.options.length) fail(`Opções duplicadas em ${group.id}.${field.id}.`);
        const compositeKey = `${group.id}.${field.id}`;
        if (fieldMap.has(compositeKey)) fail(`Chave composta duplicada: ${compositeKey}.`);
        fieldMap.set(compositeKey, field);
      }
    }
    if (fieldMap.size > MAX_STRUCTURED_FIELD_COUNT) fail("Limite de campos estruturados excedido.");
    if (exercise.notes && new Set(exercise.notes.map((note) => note.id)).size !== exercise.notes.length) fail("Notas reflexivas duplicadas.");
    const expectedKeys = Object.keys(exercise.solution.expected);
    if (expectedKeys.length !== fieldMap.size || expectedKeys.some((key) => !fieldMap.has(key))) fail("Gabarito estruturado inconsistente com os campos.");
    for (const [key, accepted] of Object.entries(exercise.solution.expected)) {
      const field = fieldMap.get(key);
      if (!field) continue;
      if (field.kind === "integer") {
        for (const val of accepted) {
          if (typeof val !== "number" || (field.min !== undefined && val < field.min) || (field.max !== undefined && val > field.max)) fail(`Gabarito inteiro inválido em ${key}.`);
        }
      } else {
        const allowed = new Set(field.options.map((opt) => opt.value));
        if (accepted.some((val) => typeof val !== "string" || !allowed.has(val))) fail(`Gabarito de escolha inválido em ${key}.`);
      }
    }
    if (exercise.solution.fieldFeedback && Object.keys(exercise.solution.fieldFeedback).some((key) => !fieldMap.has(key))) fail("Feedback por campo referencia campo inexistente.");
    if (exercise.solution.groupFeedback && Object.keys(exercise.solution.groupFeedback).some((key) => !groupIds.includes(key))) fail("Feedback por grupo referencia grupo inexistente.");
  } else if (exercise.type === "OPEN_RESPONSE") {
    const fieldIds = exercise.fields.map((field) => field.id);
    if (new Set(fieldIds).size !== fieldIds.length) fail("Campos abertos duplicados.");
    for (const field of exercise.fields) {
      if (field.minLength !== undefined && field.maxLength !== undefined && field.minLength > field.maxLength) fail(`Limites inválidos no campo aberto ${field.id}.`);
    }
    if (new Set(exercise.rubric.map((item) => item.id)).size !== exercise.rubric.length) fail("Critérios de rubrica duplicados.");
  }
});

export const AnswerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("MISCONCEPTION_QUIZ"), optionId: id }).strict(),
  z.object({ type: z.literal("PARSONS"), order }).strict(),
  z.object({ type: z.literal("ERRONEOUS_EXAMPLE"), itemIds: z.array(id).min(1).max(20) }).strict(),
  z.object({ type: z.literal("PRIMM_PREDICT"), output: z.string().max(2000) }).strict(),
  z.object({
    type: z.literal("STRUCTURED_RESPONSE"),
    values: z.record(compositeKeyId, z.union([z.number().int(), id])).refine(
      (values) => Object.keys(values).length <= MAX_STRUCTURED_FIELD_COUNT,
      "Limite de campos estruturados excedido.",
    ),
    notes: z.record(keyId, z.string().max(MAX_STRUCTURED_NOTE_LENGTH)).refine(
      (notes) => Object.keys(notes).length <= MAX_STRUCTURED_NOTES,
      "Limite de notas reflexivas excedido.",
    ).optional(),
  }).strict(),
  z.object({
    type: z.literal("OPEN_RESPONSE"),
    fields: z.record(keyId, z.string().max(MAX_OPEN_FIELD_LENGTH)).refine(
      (fields) => Object.keys(fields).length <= MAX_OPEN_RESPONSE_FIELDS,
      "Limite de campos abertos excedido.",
    ),
  }).strict(),
]);

export const StudySeedSchema = z.object({ schemaVersion: z.literal(1), lesson: LessonSchema, exercises: z.array(ExerciseSchema).min(1) }).strict().superRefine((seed, ctx) => {
  const ids = new Set<string>();
  const sectionIds = new Set((seed.lesson.layerSections ?? []).map((section) => section.id));
  for (const exercise of seed.exercises) {
    if (exercise.lessonId !== seed.lesson.id || exercise.topicId !== seed.lesson.topicId || ids.has(exercise.id)) ctx.addIssue({ code: "custom", message: "Exercício com referência inválida ou ID duplicado." });
    if (exercise.lessonSection && !sectionIds.has(exercise.lessonSection)) ctx.addIssue({ code: "custom", message: `Seção de aula inexistente: ${exercise.lessonSection}.` });
    ids.add(exercise.id);
  }
});
export type LessonLayerSection = z.infer<typeof LessonLayerSectionSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type Answer = z.infer<typeof AnswerSchema>;
export type StudySeed = z.infer<typeof StudySeedSchema>;
