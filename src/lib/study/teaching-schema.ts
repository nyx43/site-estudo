import { z } from "zod";

const text = z.string().trim().min(1);
const id = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const code = z.string().min(1).max(12000).refine((value) => value.trim().length > 0);

export const ExplainedExampleSchema = z.object({
  id, title: text, purpose: text, code,
  stdin: z.string().max(1000).optional(),
  expectedOutput: z.string().optional(), expectedError: z.enum(["TypeError", "ValueError", "NameError", "IndexError", "ZeroDivisionError", "SyntaxError"]).optional(),
  lineNotes: z.array(z.object({ line: z.number().int().positive(), explanation: text }).strict()).min(1),
  takeaway: text,
}).strict().superRefine((example, ctx) => {
  if ((example.expectedOutput === undefined) === (example.expectedError === undefined)) ctx.addIssue({ code: "custom", message: "Informe saída ou erro esperado, exclusivamente." });
  const lines = example.code.split("\n");
  const covered = new Set(example.lineNotes.map((note) => note.line));
  if (covered.size !== example.lineNotes.length || example.lineNotes.some((note) => note.line > lines.length) || lines.some((line, index) => line.trim() && !covered.has(index + 1))) ctx.addIssue({ code: "custom", message: "Explique cada linha não vazia, sem referências duplicadas ou inexistentes." });
});

export const TeachingSchema = z.object({
  level: z.enum(["FOUNDATION", "INTERMEDIATE", "ADVANCED", "SPECIALIZED"]),
  introduction: z.array(text).min(2),
  prerequisites: z.array(z.object({ topicId: id, reason: text }).strict()),
  glossary: z.array(z.object({ term: text, meaning: text, example: text }).strict()).min(4),
  commands: z.array(z.object({
    name: text, kind: z.enum(["FUNCTION", "TYPE", "KEYWORD", "OPERATOR", "SYNTAX", "CONCEPT", "TOOL"]),
    syntax: text, explanation: text, whenToUse: text, pitfalls: z.array(text).min(1),
    examples: z.array(ExplainedExampleSchema).min(1),
  }).strict()),
  walkthroughs: z.array(ExplainedExampleSchema).min(1),
  edgeCases: z.array(z.object({ title: text, explanation: text, example: ExplainedExampleSchema }).strict()).min(1),
  aiReview: z.array(z.object({
    title: text, request: text, generated: ExplainedExampleSchema,
    diagnosis: z.array(text).min(2), correction: ExplainedExampleSchema,
    acceptanceChecks: z.array(z.object({ scenario: text, expected: text, why: text }).strict()).min(2),
  }).strict()).min(1),
  advancedConnections: z.array(z.object({ title: text, explanation: text, topicIds: z.array(id), caution: text }).strict()).min(2),
  reviewChecklist: z.array(text).min(3),
  sources: z.array(z.object({ sourceId: id, locator: text, use: text }).strict()).min(1),
}).strict();
export type Teaching = z.infer<typeof TeachingSchema>;
export type ExplainedExample = z.infer<typeof ExplainedExampleSchema>;
