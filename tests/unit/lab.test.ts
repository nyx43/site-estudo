import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { createLabHandlers } from "@/lib/http/lab-handlers";
import {
  LAB_DRAFTS_STORAGE_KEY,
  buildLabDraftKey,
  parseLabDraftStore,
  serializeLabDraftStore,
} from "@/lib/lab/drafts";
import { normalizeLabOutput, toPublicLab } from "@/lib/lab/public";
import {
  SandboxBusyError,
  SandboxUnavailableError,
  buildBubblewrapArgs,
  createSandboxRunner,
  type PythonSandboxRunner,
} from "@/lib/lab/sandbox";
import { LAB_LIMITS, LabDefinitionSchema, LabRunRequestSchema, type LabDefinition } from "@/lib/lab/schema";
import { createLabService } from "@/lib/lab/service";

const sampleLab: LabDefinition = {
  schemaVersion: 1,
  id: "lab-demo",
  topicId: "python.lacos-de-repeticao",
  title: "Laboratório demo",
  intro: "Treine laços em Python.",
  language: "python",
  starterFreeCode: "print('oi')",
  challenges: [
    {
      id: "c1",
      title: "Desafio 1",
      prompt: "Leia n e imprima de 1 até n.",
      starterCode: "n = int(input())",
      referenceSolution: "n = int(input())\nfor i in range(1, n + 1):\n    print(i)",
      hint: "Use range(1, n + 1).",
      defaultStdin: "2",
      tests: [
        { id: "t1", name: "n = 2", description: "Imprime 1 e 2.", stdin: "2\n", expectedOutput: "1\n2" },
        { id: "t2", name: "n = 1", description: "Imprime 1.", stdin: "1\n", expectedOutput: "1" },
      ],
    },
  ],
};

function makeJsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://127.0.0.1:3000/api/lab/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "http://127.0.0.1:3000",
      host: "127.0.0.1:3000",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("lab schemas, sanitization, and drafts", () => {
  it("strips private referenceSolution in toPublicLab", () => {
    const publicLab = toPublicLab(sampleLab);
    expect(publicLab.challenges[0].starterCode).toBe("n = int(input())");
    expect("referenceSolution" in publicLab.challenges[0]).toBe(false);
    expect(JSON.stringify(publicLab)).not.toContain("range(1, n + 1)\n    print(i)");
  });

  it("rejects duplicate challenge ids and oversized code in schema", () => {
    expect(() =>
      LabDefinitionSchema.parse({
        ...sampleLab,
        challenges: [sampleLab.challenges[0], { ...sampleLab.challenges[0] }],
      }),
    ).toThrow(/duplicados/i);

    expect(() =>
      LabRunRequestSchema.parse({
        mode: "run",
        code: "x" .repeat(LAB_LIMITS.maxCodeChars + 1),
        stdin: "",
      }),
    ).toThrow();

    expect(() =>
      LabRunRequestSchema.parse({
        mode: "run",
        code: "   \n  ",
        stdin: "",
      }),
    ).toThrow(/vazio/i);
  });

  it("normalizes CRLF and single trailing newline in outputs", () => {
    expect(normalizeLabOutput("1\r\n2\r\n")).toBe("1\n2");
    expect(normalizeLabOutput("1\n\n")).toBe("1\n");
    expect(normalizeLabOutput("abc")).toBe("abc");
  });

  it("parses and bounds local draft storage safely", () => {
    const key = buildLabDraftKey("lab-demo", "c1");
    expect(LAB_DRAFTS_STORAGE_KEY).toBe("estudo-lab-drafts-v1");
    const serialized = serializeLabDraftStore({
      [key]: {
        code: "print(1)",
        stdin: "10",
        passed: true,
        updatedAt: "2026-11-13T21:00:00Z",
      },
    });
    const parsed = parseLabDraftStore(serialized);
    expect(parsed[key]).toEqual({
      code: "print(1)",
      stdin: "10",
      passed: true,
      updatedAt: "2026-11-13T21:00:00Z",
    });

    expect(parseLabDraftStore("not-json{")).toEqual({});
    expect(parseLabDraftStore('{"k":{"code":123}}')).toEqual({});
  });
});

describe("lab service and HTTP handlers", () => {
  it("runs challenge tests sequentially and requires exitCode 0 without truncation or timeout", async () => {
    const execute = vi
      .fn<PythonSandboxRunner["execute"]>()
      .mockResolvedValueOnce({
        stdout: "1\n2\n",
        stderr: "",
        exitCode: 0,
        signal: null,
        timedOut: false,
        outputTruncated: false,
        durationMs: 18,
        isolated: true,
      })
      .mockResolvedValueOnce({
        stdout: "1\n",
        stderr: "Traceback...",
        exitCode: 1,
        signal: null,
        timedOut: false,
        outputTruncated: false,
        durationMs: 12,
        isolated: true,
      });

    const service = createLabService({
      loadLabByTopic: async (id) => (id === sampleLab.topicId ? sampleLab : null),
      runner: { execute },
    });

    const response = await service.run({
      mode: "test",
      topicId: sampleLab.topicId,
      challengeId: "c1",
      code: "print(1)",
    });

    expect(response.mode).toBe("test");
    if (response.mode !== "test") throw new Error("unexpected");
    expect(response.passedCount).toBe(1);
    expect(response.totalCount).toBe(2);
    expect(response.allPassed).toBe(false);
    expect(response.results[0].passed).toBe(true);
    expect(response.results[1].passed).toBe(false);
  });

  it("enforces Origin CSRF, content-type, payload limits, and fail-closed status codes", async () => {
    const mockRunner: PythonSandboxRunner = {
      execute: async () => ({
        stdout: "ok\n",
        stderr: "",
        exitCode: 0,
        signal: null,
        timedOut: false,
        outputTruncated: false,
        durationMs: 10,
        isolated: true,
      }),
    };
    const handlers = createLabHandlers(
      createLabService({
        loadLabByTopic: async () => sampleLab,
        runner: mockRunner,
      }),
    );

    const badOrigin = await handlers.run(
      makeJsonRequest({ mode: "run", code: "print(1)", stdin: "" }, { origin: "https://evil.example" }),
    );
    expect(badOrigin.status).toBe(403);
    expect(badOrigin.headers.get("cache-control")).toBe("private, no-store");

    const badType = await handlers.run(
      makeJsonRequest("print(1)", { "Content-Type": "text/plain" }),
    );
    expect(badType.status).toBe(415);

    const badJson = await handlers.run(makeJsonRequest("{broken"));
    expect(badJson.status).toBe(400);

    const tooLarge = await handlers.run(
      makeJsonRequest({ mode: "run", code: "a".repeat(40000), stdin: "" }),
    );
    expect(tooLarge.status).toBe(413);

    const notFoundChallenge = await handlers.run(
      makeJsonRequest({ mode: "test", topicId: sampleLab.topicId, challengeId: "missing", code: "print(1)" }),
    );
    expect(notFoundChallenge.status).toBe(404);

    const unavailableHandlers = createLabHandlers(
      createLabService({
        loadLabByTopic: async () => sampleLab,
        runner: {
          execute: async () => {
            throw new SandboxUnavailableError();
          },
        },
      }),
    );
    const unavailable = await unavailableHandlers.run(makeJsonRequest({ mode: "run", code: "print(1)", stdin: "" }));
    expect(unavailable.status).toBe(503);
    expect((await unavailable.json()).error.code).toBe("SANDBOX_UNAVAILABLE");

    const busyHandlers = createLabHandlers(
      createLabService({
        loadLabByTopic: async () => sampleLab,
        runner: {
          execute: async () => {
            throw new SandboxBusyError();
          },
        },
      }),
    );
    const busy = await busyHandlers.run(makeJsonRequest({ mode: "run", code: "print(1)", stdin: "" }));
    expect(busy.status).toBe(429);
    expect((await busy.json()).error.code).toBe("SANDBOX_BUSY");
  });
});

describe("sandbox fail-closed isolation contract", () => {
  it("constructs strict bubblewrap flags disabling network, userns, writable /sandbox, and host env", () => {
    const args = buildBubblewrapArgs({
      pythonPath: "/usr/bin/python3",
      tmpfsBytes: LAB_LIMITS.tmpfsBytes,
      pathExists: (p) => p === "/lib",
    });
    expect(args).toContain("--unshare-all");
    expect(args).toContain("--unshare-user");
    expect(args).toContain("--disable-userns");
    expect(args).toContain("--assert-userns-disabled");
    expect(args).toContain("--cap-drop");
    expect(args).toContain("ALL");
    expect(args).toContain("--clearenv");
    expect(args).toContain("0555");
    expect(args).toContain("-I");
  });

  it("fails closed when bwrap binary is missing or exits before handshake", async () => {
    const missingBinary = createSandboxRunner({ pathExists: () => false });
    await expect(missingBinary.execute({ code: "print(1)" })).rejects.toBeInstanceOf(SandboxUnavailableError);

    const spawnWithoutHandshake = (() => {
      const child = new EventEmitter() as ChildProcess;
      child.stdin = { end: vi.fn(), on: vi.fn() } as unknown as ChildProcess["stdin"];
      child.stdout = new EventEmitter() as ChildProcess["stdout"];
      child.stderr = new EventEmitter() as ChildProcess["stderr"];
      const fd3 = new EventEmitter();
      Object.defineProperty(child, "stdio", { value: [child.stdin, child.stdout, child.stderr, fd3] });
      child.kill = vi.fn(() => true);
      queueMicrotask(() => child.emit("close", 1, null));
      return child;
    }) as unknown as NonNullable<Parameters<typeof createSandboxRunner>[0]>["spawnProcess"];

    const abortedSandbox = createSandboxRunner({
      pathExists: () => true,
      spawnProcess: spawnWithoutHandshake,
    });
    await expect(abortedSandbox.execute({ code: "print(1)" })).rejects.toBeInstanceOf(SandboxUnavailableError);
  });

  it("queues concurrent executions and rejects with SandboxBusyError above maxQueuedRuns", async () => {
    const releases: (() => void)[] = [];
    const spawnControlled = (() => {
      const child = new EventEmitter() as ChildProcess;
      child.stdin = { end: vi.fn(), on: vi.fn() } as unknown as ChildProcess["stdin"];
      child.stdout = new EventEmitter() as ChildProcess["stdout"];
      child.stderr = new EventEmitter() as ChildProcess["stderr"];
      const fd3 = new EventEmitter();
      Object.defineProperty(child, "stdio", { value: [child.stdin, child.stdout, child.stderr, fd3] });
      child.kill = vi.fn(() => true);
      releases.push(() => {
        fd3.emit("data", Buffer.from("OK"));
        child.stdout?.emit("data", Buffer.from("done\n"));
        child.emit("close", 0, null);
      });
      return child;
    }) as unknown as NonNullable<Parameters<typeof createSandboxRunner>[0]>["spawnProcess"];

    const runner = createSandboxRunner({
      pathExists: () => true,
      spawnProcess: spawnControlled,
    });

    const totalAccepted = LAB_LIMITS.maxConcurrentRuns + LAB_LIMITS.maxQueuedRuns;
    const accepted = Array.from({ length: totalAccepted }, () => runner.execute({ code: "print(1)" }));

    await expect(runner.execute({ code: "print(1)" })).rejects.toBeInstanceOf(SandboxBusyError);

    while (releases.length > 0) {
      const finish = releases.shift();
      finish?.();
      await Promise.resolve();
      await Promise.resolve();
    }

    const results = await Promise.all(accepted);
    expect(results).toHaveLength(totalAccepted);
    expect(results.every((item) => item.stdout === "done\n")).toBe(true);
  });
});
