import { type SpawnOptions, spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { loadLabs } from "@/lib/content/load-labs";
import { normalizeLabOutput } from "@/lib/lab/public";
import { SandboxAbortedError, createSandboxRunner, getDefaultSandboxRunner } from "@/lib/lab/sandbox";

describe("real bwrap Python sandbox isolation and behavior", () => {
  const runner = getDefaultSandboxRunner();

  it("executes Python loops with stdin and UTF-8 output", async () => {
    const result = await runner.execute({
      code: [
        "nome = input().strip()",
        "for i in range(1, 4):",
        "    print(f'Olá, {nome}: {i}')",
      ].join("\n"),
      stdin: "Maria\n",
    });

    expect(result.isolated).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.outputTruncated).toBe(false);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("Olá, Maria: 1\nOlá, Maria: 2\nOlá, Maria: 3\n");
    expect(result.stderr).toBe("");
  });

  it("reports clean syntax and runtime tracebacks referencing codigo.py", async () => {
    const syntax = await runner.execute({ code: "for x in range(3)\n    print(x)" });
    expect(syntax.exitCode).toBe(1);
    expect(syntax.stderr).toContain('File "codigo.py"');
    expect(syntax.stderr).toContain("SyntaxError");

    const runtime = await runner.execute({ code: "print(10 / 0)" });
    expect(runtime.exitCode).toBe(1);
    expect(runtime.stderr).toContain('File "codigo.py"');
    expect(runtime.stderr).toContain("ZeroDivisionError");
  });

  it("blocks network access, host filesystem access, and secret environment variables", async () => {
    process.env.LAB_TEST_HOST_SECRET = "should-not-leak";
    try {
      const probe = await runner.execute({
        code: [
          "import os, pathlib, socket",
          "print('CWD=' + os.getcwd())",
          "print('HAS_SECRET=' + str('LAB_TEST_HOST_SECRET' in os.environ))",
          "print('EXTRA_ENV=' + ','.join(sorted(set(os.environ.keys()) - {'HOME', 'LC_CTYPE', 'PATH', 'PWD', 'PYTHONDONTWRITEBYTECODE', 'PYTHONIOENCODING', 'PYTHONUTF8'})))",
          "for target in ['/home', '/etc/passwd', 'data/estudo.db', '.env']:",
          "    print(target + ':' + str(os.path.exists(target)))",
          "try:",
          "    pathlib.Path('/sandbox/write_test.txt').write_text('no')",
          "    print('WRITE_SANDBOX=ALLOWED')",
          "except Exception as exc:",
          "    print('WRITE_SANDBOX=BLOCKED:' + type(exc).__name__)",
          "try:",
          "    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)",
          "    s.settimeout(0.5)",
          "    s.connect(('1.1.1.1', 80))",
          "    print('NET=ALLOWED')",
          "except Exception as exc:",
          "    print('NET=BLOCKED:' + type(exc).__name__)",
        ].join("\n"),
      });

      expect(probe.exitCode).toBe(0);
      expect(probe.stdout).toContain("CWD=/sandbox\n");
      expect(probe.stdout).toContain("HAS_SECRET=False\n");
      expect(probe.stdout).toContain("EXTRA_ENV=\n");
      expect(probe.stdout).toContain("/home:False\n");
      expect(probe.stdout).toContain("/etc/passwd:False\n");
      expect(probe.stdout).toContain("data/estudo.db:False\n");
      expect(probe.stdout).toContain(".env:False\n");
      expect(probe.stdout).toContain("WRITE_SANDBOX=BLOCKED:");
      expect(probe.stdout).toContain("NET=BLOCKED:");
    } finally {
      delete process.env.LAB_TEST_HOST_SECRET;
    }
  });

  it("blocks process spawning, thread creation, and privilege escalation of resource limits", async () => {
    const probe = await runner.execute({
      code: [
        "import os, resource, threading",
        "try:",
        "    pid = os.fork()",
        "    if pid == 0: os._exit(0)",
        "    print('FORK=ALLOWED')",
        "except Exception as exc:",
        "    print('FORK=BLOCKED:' + type(exc).__name__)",
        "try:",
        "    t = threading.Thread(target=lambda: None)",
        "    t.start()",
        "    t.join()",
        "    print('THREAD=ALLOWED')",
        "except Exception as exc:",
        "    print('THREAD=BLOCKED:' + type(exc).__name__)",
        "try:",
        "    resource.setrlimit(resource.RLIMIT_CPU, (120, 120))",
        "    print('RAISE_LIMIT=ALLOWED')",
        "except Exception as exc:",
        "    print('RAISE_LIMIT=BLOCKED:' + type(exc).__name__)",
      ].join("\n"),
    });

    expect(probe.exitCode).toBe(0);
    expect(probe.stdout).toContain("FORK=BLOCKED:");
    expect(probe.stdout).toContain("THREAD=BLOCKED:");
    expect(probe.stdout).toContain("RAISE_LIMIT=BLOCKED:");
  });

  it("kills infinite sleep/loop cleanly on wall-clock timeout", async () => {
    const shortRunner = createSandboxRunner({ limits: { timeoutMs: 400, cpuSeconds: 5 } });
    const timedSleep = await shortRunner.execute({
      code: "import time\ntime.sleep(10)\nprint('never')",
    });

    expect(timedSleep.timedOut).toBe(true);
    expect(timedSleep.stdout).toBe("");
    expect(timedSleep.stderr.length).toBeGreaterThan(0);
    expect(timedSleep.durationMs).toBeLessThan(3000);

    const busyLoop = await shortRunner.execute({
      code: "while True:\n    pass",
    });

    expect(busyLoop.timedOut).toBe(true);
    expect(busyLoop.durationMs).toBeLessThan(3000);
  });

  it("truncates and kills runaway stdout output", async () => {
    const bomb = await runner.execute({
      code: "for _ in range(10000):\n    print('A' * 200)",
    });

    expect(bomb.outputTruncated).toBe(true);
    expect(Buffer.byteLength(bomb.stdout, "utf8")).toBeLessThanOrEqual(16384);
  });

  it("cancels mid-loop via AbortController leaving zero orphan processes or temp dirs and recovers cleanly", async () => {
    const spawnedPids: number[] = [];
    const trackedSpawn = ((cmd: string, args: readonly string[], opts: SpawnOptions) => {
      const child = spawn(cmd, args, opts);
      if (child.pid) spawnedPids.push(child.pid);
      return child;
    }) as unknown as typeof spawn;
    const trackedRunner = createSandboxRunner({
      limits: { timeoutMs: 4500, cpuSeconds: 5 },
      spawnProcess: trackedSpawn,
    });

    const tmpBefore = new Set(readdirSync(tmpdir()));
    const controller = new AbortController();
    const startedAt = Date.now();
    const cancelTimer = setTimeout(() => controller.abort(), 160);

    try {
      await expect(
        trackedRunner.execute({
          code: "import time\nwhile True:\n    time.sleep(0.05)",
          signal: controller.signal,
        }),
      ).rejects.toBeInstanceOf(SandboxAbortedError);
    } finally {
      clearTimeout(cancelTimer);
    }

    const cancelElapsedMs = Date.now() - startedAt;
    expect(cancelElapsedMs).toBeLessThan(1500);
    expect(spawnedPids.length).toBe(1);

    // O processo bwrap/python deve ter sido encerrado e recolhido do SO.
    for (const pid of spawnedPids) {
      let alive = true;
      try {
        process.kill(pid, 0);
      } catch {
        alive = false;
      }
      expect(alive).toBe(false);
    }

    const tmpAfter = readdirSync(tmpdir());
    const leftoverEntries = tmpAfter.filter((entry) => !tmpBefore.has(entry));
    expect(leftoverEntries).toEqual([]);

    // Execução subsequente funciona normalmente com a fila liberada.
    const nextRun = await trackedRunner.execute({ code: "print('recuperado')" });
    expect(nextRun.exitCode).toBe(0);
    expect(nextRun.stdout).toBe("recuperado\n");
  });

  it("passes every challenge test case in content/labs using its referenceSolution", async () => {
    const labs = await loadLabs();
    expect(labs.length).toBeGreaterThanOrEqual(1);

    for (const lab of labs) {
      const freeResult = await runner.execute({ code: lab.starterFreeCode });
      expect(freeResult.exitCode).toBe(0);
      expect(freeResult.timedOut).toBe(false);

      for (const challenge of lab.challenges) {
        for (const testCase of challenge.tests) {
          const result = await runner.execute({
            code: challenge.referenceSolution,
            stdin: testCase.stdin,
          });
          expect(result.exitCode).toBe(0);
          expect(result.timedOut).toBe(false);
          expect(normalizeLabOutput(result.stdout)).toBe(normalizeLabOutput(testCase.expectedOutput));
        }
      }
    }
  });
});
