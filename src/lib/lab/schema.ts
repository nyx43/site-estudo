import { z } from "zod";

const text = z.string().trim().min(1);
const id = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);

export const LAB_LIMITS = {
  maxCodeChars: 8000,
  maxStdinChars: 4000,
  maxBodyBytes: 32768,
  defaultTimeoutMs: 2500,
  maxTimeoutMs: 5000,
  cpuLimitSeconds: 2,
  memoryLimitBytes: 128 * 1024 * 1024,
  maxFileBytes: 65536,
  maxOpenFiles: 32,
  maxProcesses: 0,
  maxOutputBytes: 16384,
  maxCombinedRunawayBytes: 65536,
  tmpfsBytes: 1048576,
  maxConcurrentRuns: 2,
  maxQueuedRuns: 12,
} as const;

const code = z
  .string()
  .min(1, "Código vazio.")
  .max(LAB_LIMITS.maxCodeChars, `Código limitado a ${LAB_LIMITS.maxCodeChars} caracteres.`)
  .refine((value) => value.trim().length > 0, "Código vazio.");

export const LabTestCaseSchema = z
  .object({
    id,
    name: text,
    description: text,
    stdin: z.string().max(LAB_LIMITS.maxStdinChars).default(""),
    expectedOutput: z.string().max(LAB_LIMITS.maxOutputBytes),
  })
  .strict();

export const LabChallengeSchema = z
  .object({
    id,
    title: text,
    prompt: text,
    starterCode: code,
    referenceSolution: code,
    hint: text.optional(),
    defaultStdin: z.string().max(LAB_LIMITS.maxStdinChars).default(""),
    tests: z.array(LabTestCaseSchema).min(1).max(10),
  })
  .strict()
  .superRefine((challenge, ctx) => {
    const testIds = challenge.tests.map((testCase) => testCase.id);
    if (new Set(testIds).size !== testIds.length) {
      ctx.addIssue({ code: "custom", message: `IDs de teste duplicados no desafio ${challenge.id}.` });
    }
  });

export const LabDefinitionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    topicId: id,
    title: text,
    intro: text,
    language: z.literal("python"),
    starterFreeCode: code,
    challenges: z.array(LabChallengeSchema).min(1).max(8),
  })
  .strict()
  .superRefine((lab, ctx) => {
    const challengeIds = lab.challenges.map((challenge) => challenge.id);
    if (new Set(challengeIds).size !== challengeIds.length) {
      ctx.addIssue({ code: "custom", message: `IDs de desafio duplicados no laboratório ${lab.id}.` });
    }
  });

export const LabRunRequestSchema = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("run"),
      code,
      stdin: z.string().max(LAB_LIMITS.maxStdinChars, `Entrada limitada a ${LAB_LIMITS.maxStdinChars} caracteres.`).default(""),
    })
    .strict(),
  z
    .object({
      mode: z.literal("test"),
      topicId: id,
      challengeId: id,
      code,
    })
    .strict(),
]);

export type LabTestCase = z.infer<typeof LabTestCaseSchema>;
export type LabChallenge = z.infer<typeof LabChallengeSchema>;
export type LabDefinition = z.infer<typeof LabDefinitionSchema>;
export type LabRunRequest = z.infer<typeof LabRunRequestSchema>;

export interface LabExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  outputTruncated: boolean;
  durationMs: number;
  isolated: true;
}

export interface LabTestCaseResult {
  id: string;
  name: string;
  description: string;
  stdin: string;
  expectedOutput: string;
  actualOutput: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  outputTruncated: boolean;
  durationMs: number;
  passed: boolean;
}

export type LabRunResponse =
  | {
      mode: "run";
      execution: LabExecutionResult;
    }
  | {
      mode: "test";
      challengeId: string;
      passedCount: number;
      totalCount: number;
      allPassed: boolean;
      results: LabTestCaseResult[];
    };

export interface LabSandboxStatus {
  available: boolean;
  reason?: string;
  checkedAt: string;
  limits: {
    timeoutMs: number;
    memoryMb: number;
    maxOutputKb: number;
    cpuSeconds: number;
  };
}
