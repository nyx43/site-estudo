import { loadLabByTopic } from "../content/load-labs";
import { normalizeLabOutput } from "./public";
import { SandboxAbortedError, getDefaultSandboxRunner, type PythonSandboxRunner } from "./sandbox";
import type { LabDefinition, LabRunRequest, LabRunResponse, LabTestCaseResult } from "./schema";

export class LabError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface LabServiceDependencies {
  loadLabByTopic?: (topicId: string) => Promise<LabDefinition | null>;
  runner?: PythonSandboxRunner;
}

export function createLabService(deps: LabServiceDependencies = {}) {
  const findLab = deps.loadLabByTopic ?? ((topicId: string) => loadLabByTopic(topicId));
  const runner = deps.runner ?? getDefaultSandboxRunner();

  return {
    async run(request: LabRunRequest, options?: { signal?: AbortSignal }): Promise<LabRunResponse> {
      const signal = options?.signal;
      if (signal?.aborted) {
        throw new SandboxAbortedError();
      }

      if (request.mode === "run") {
        const execution = await runner.execute({ code: request.code, stdin: request.stdin, signal });
        return { mode: "run", execution };
      }

      const lab = await findLab(request.topicId);
      if (!lab) {
        throw new LabError(404, "Laboratório não encontrado para este tópico.");
      }

      const challenge = lab.challenges.find((item) => item.id === request.challengeId);
      if (!challenge) {
        throw new LabError(404, "Desafio não encontrado neste laboratório.");
      }

      const results: LabTestCaseResult[] = [];
      for (const testCase of challenge.tests) {
        if (signal?.aborted) {
          throw new SandboxAbortedError();
        }
        const execution = await runner.execute({ code: request.code, stdin: testCase.stdin, signal });
        const actualOutput = normalizeLabOutput(execution.stdout);
        const expectedOutput = normalizeLabOutput(testCase.expectedOutput);
        const passed =
          !execution.timedOut &&
          !execution.outputTruncated &&
          execution.exitCode === 0 &&
          actualOutput === expectedOutput;

        results.push({
          id: testCase.id,
          name: testCase.name,
          description: testCase.description,
          stdin: testCase.stdin,
          expectedOutput,
          actualOutput,
          stderr: execution.stderr,
          exitCode: execution.exitCode,
          timedOut: execution.timedOut,
          outputTruncated: execution.outputTruncated,
          durationMs: execution.durationMs,
          passed,
        });
      }

      const passedCount = results.filter((item) => item.passed).length;
      return {
        mode: "test",
        challengeId: challenge.id,
        passedCount,
        totalCount: results.length,
        allPassed: passedCount === results.length,
        results,
      };
    },
  };
}
