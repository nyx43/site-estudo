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
  SandboxAbortedError,
  SandboxBusyError,
  SandboxUnavailableError,
  buildBubblewrapArgs,
  createSandboxRunner,
  probeSandboxAvailability,
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

    const missingOriginRequest = new Request("http://127.0.0.1:3000/api/lab/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        host: "127.0.0.1:3000",
      },
      body: JSON.stringify({ mode: "run", code: "print(1)", stdin: "" }),
    });
    const missingOrigin = await handlers.run(missingOriginRequest);
    expect(missingOrigin.status).toBe(403);

    const dnsRebinding = await handlers.run(
      makeJsonRequest(
        { mode: "run", code: "print(1)", stdin: "" },
        { host: "rebind.attacker:3000", origin: "http://rebind.attacker:3000" },
      ),
    );
    expect(dnsRebinding.status).toBe(403);

    const userinfoSpoof = await handlers.run(
      makeJsonRequest(
        { mode: "run", code: "print(1)", stdin: "" },
        { host: "127.0.0.1@evil.example", origin: "http://127.0.0.1@evil.example" },
      ),
    );
    expect(userinfoSpoof.status).toBe(403);

    const localhostLoopback = await handlers.run(
      makeJsonRequest(
        { mode: "run", code: "print(1)", stdin: "" },
        { host: "localhost:3000", origin: "http://localhost:3000" },
      ),
    );
    expect(localhostLoopback.status).toBe(200);

    const ipv6Loopback = await handlers.run(
      makeJsonRequest(
        { mode: "run", code: "print(1)", stdin: "" },
        { host: "[::1]:3000", origin: "http://[::1]:3000" },
      ),
    );
    expect(ipv6Loopback.status).toBe(200);

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

type SpawnFn = NonNullable<Parameters<typeof createSandboxRunner>[0]>["spawnProcess"];

function createMockSandboxChild(onKill?: (signal: NodeJS.Signals) => void) {
  const child = new EventEmitter() as ChildProcess;
  child.stdin = { end: vi.fn(), on: vi.fn(), destroy: vi.fn() } as unknown as ChildProcess["stdin"];
  child.stdout = Object.assign(new EventEmitter(), { destroy: vi.fn() }) as unknown as ChildProcess["stdout"];
  child.stderr = Object.assign(new EventEmitter(), { destroy: vi.fn() }) as unknown as ChildProcess["stderr"];
  const fd3 = new EventEmitter();
  Object.defineProperty(child, "stdio", { value: [child.stdin, child.stdout, child.stderr, fd3] });
  child.kill = vi.fn((sig?: NodeJS.Signals | number) => {
    onKill?.((typeof sig === "string" ? sig : "SIGKILL") as NodeJS.Signals);
    return true;
  });
  return { child, fd3 };
}

  it("aborts queued and active executions, releases slots, and avoids running later tests", async () => {
    const children: { child: ChildProcess; fd3: EventEmitter }[] = [];
    const runner = createSandboxRunner({
      pathExists: () => true,
      spawnProcess: (() => {
        const entry = createMockSandboxChild(() => {
          queueMicrotask(() => entry.child.emit("close", null, "SIGKILL"));
        });
        children.push(entry);
        return entry.child;
      }) as unknown as SpawnFn,
    });

    // Lot 1 and 2 occupy active slots; slot 3 queues
    const activeController = new AbortController();
    const queuedController = new AbortController();
    const run1 = runner.execute({ code: "while True: pass", signal: activeController.signal });
    const run2 = runner.execute({ code: "while True: pass" });
    const run3 = runner.execute({ code: "print('queued')", signal: queuedController.signal });

    // Cancel queued execution first while queue is full
    queuedController.abort();
    await expect(run3).rejects.toBeInstanceOf(SandboxAbortedError);

    // Cancel active execution 1 -> kills active child 1 and frees slot cleanly
    activeController.abort();
    await expect(run1).rejects.toBeInstanceOf(SandboxAbortedError);

    // Finish active execution 2 normally and verify next execution succeeds cleanly
    const active2 = children[1];
    active2.fd3.emit("data", Buffer.from("OK"));
    active2.child.stdout?.emit("data", Buffer.from("second\n"));
    active2.child.emit("close", 0, null);
    expect((await run2).stdout).toBe("second\n");

    const afterCancel = runner.execute({ code: "print('fresh')" });
    const freshChild = children[2];
    freshChild.fd3.emit("data", Buffer.from("OK"));
    freshChild.child.stdout?.emit("data", Buffer.from("fresh\n"));
    freshChild.child.emit("close", 0, null);
    expect((await afterCancel).stdout).toBe("fresh\n");

    // HTTP handler returns 499 SANDBOX_ABORTED when AbortSignal fires
    const executeSpy = vi.fn<PythonSandboxRunner["execute"]>().mockRejectedValue(new SandboxAbortedError());
    const handlers = createLabHandlers(
      createLabService({
        loadLabByTopic: async () => sampleLab,
        runner: { execute: executeSpy },
      }),
    );
    const reqController = new AbortController();
    const abortedResponse = await handlers.run(
      new Request("http://127.0.0.1:3000/api/lab/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://127.0.0.1:3000",
          host: "127.0.0.1:3000",
        },
        body: JSON.stringify({
          mode: "test",
          topicId: sampleLab.topicId,
          challengeId: "c1",
          code: "print(1)",
        }),
        signal: reqController.signal,
      }),
    );
    expect(abortedResponse.status).toBe(499);
    expect((await abortedResponse.json()).error.code).toBe("SANDBOX_ABORTED");
    expect(executeSpy).toHaveBeenCalledTimes(1);
  });

  it("reports sandbox availability accurately via probeSandboxAvailability and GET /api/lab/status handler", async () => {
    const missingBinaries = await probeSandboxAvailability({
      pathExists: () => false,
    });
    expect(missingBinaries.available).toBe(false);
    expect(missingBinaries.reason).toContain("bubblewrap ou python3");

    const failedHandshake = await probeSandboxAvailability({
      pathExists: () => true,
      spawnProcess: (() => {
        const { child } = createMockSandboxChild();
        queueMicrotask(() => child.emit("close", 1, null));
        return child;
      }) as unknown as SpawnFn,
    });
    expect(failedHandshake.available).toBe(false);
    expect(failedHandshake.reason).toContain("falhou na inicialização");

    const healthy = await probeSandboxAvailability({
      pathExists: () => true,
      spawnProcess: (() => {
        const { child, fd3 } = createMockSandboxChild();
        queueMicrotask(() => {
          fd3.emit("data", Buffer.from("OK"));
          child.emit("close", 0, null);
        });
        return child;
      }) as unknown as SpawnFn,
    });
    expect(healthy.available).toBe(true);
    expect(healthy.limits.memoryMb).toBe(128);

    const statusHandler = createLabHandlers(
      createLabService({ loadLabByTopic: async () => sampleLab, runner: { execute: vi.fn() } }),
      async () => missingBinaries,
    );
    const response = await statusHandler.status();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const json = (await response.json()) as { data: { available: boolean; reason?: string } };
    expect(json.data.available).toBe(false);
    expect(json.data.reason).toContain("bubblewrap");
  });
});
