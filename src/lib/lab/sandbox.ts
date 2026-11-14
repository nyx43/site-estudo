import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import { existsSync } from "node:fs";
import { LAB_LIMITS, type LabExecutionResult, type LabSandboxStatus } from "./schema";

const defaultPathExists = (target: string) => existsSync(/*turbopackIgnore: true*/ target);
const defaultSpawnProcess = ((command: string, args: readonly string[], options?: SpawnOptions) =>
  spawn(/*turbopackIgnore: true*/ command, args, options ?? {})) as typeof spawn;

export class SandboxUnavailableError extends Error {
  readonly code = "SANDBOX_UNAVAILABLE" as const;

  constructor(message = "A sandbox isolada de execução Python não está disponível neste ambiente.") {
    super(message);
  }
}

export class SandboxBusyError extends Error {
  readonly code = "SANDBOX_BUSY" as const;

  constructor(message = "O laboratório está processando muitas execuções simultâneas. Aguarde alguns segundos.") {
    super(message);
  }
}

export class SandboxAbortedError extends Error {
  readonly code = "SANDBOX_ABORTED" as const;

  constructor(message = "Execução cancelada.") {
    super(message);
  }
}

export interface SandboxExecutionInput {
  code: string;
  stdin?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface SandboxLimitsConfig {
  timeoutMs: number;
  cpuSeconds: number;
  memoryBytes: number;
  fileBytes: number;
  openFiles: number;
  maxProcesses: number;
  maxOutputBytes: number;
  maxCombinedRunawayBytes: number;
  tmpfsBytes: number;
}

export interface PythonSandboxRunner {
  execute(input: SandboxExecutionInput): Promise<LabExecutionResult>;
}

export interface SandboxDependencies {
  bwrapPath?: string;
  pythonPath?: string;
  pathExists?: (path: string) => boolean;
  spawnProcess?: typeof spawn;
  limits?: Partial<SandboxLimitsConfig>;
}

const PYTHON_SANDBOX_RUNNER = `
import io, json, os, resource, sys, traceback

def _apply_limits(limits):
    resource.setrlimit(resource.RLIMIT_AS, (limits["memoryBytes"], limits["memoryBytes"]))
    resource.setrlimit(resource.RLIMIT_CPU, (limits["cpuSeconds"], limits["cpuSeconds"]))
    resource.setrlimit(resource.RLIMIT_FSIZE, (limits["fileBytes"], limits["fileBytes"]))
    resource.setrlimit(resource.RLIMIT_NOFILE, (limits["openFiles"], limits["openFiles"]))
    resource.setrlimit(resource.RLIMIT_NPROC, (limits["maxProcesses"], limits["maxProcesses"]))

_raw = sys.stdin.read()
_payload = json.loads(_raw)
del _raw
_apply_limits(_payload["limits"])
os.write(3, b"OK")
os.close(3)

_code = _payload["code"]
_user_stdin = _payload.get("stdin", "")
del _payload
sys.stdin = io.StringIO(_user_stdin)
del _user_stdin

_exit_code = 0
try:
    _compiled = compile(_code, "codigo.py", "exec")
    del _code
    exec(_compiled, {"__name__": "__main__"})
except SystemExit as _exc:
    if isinstance(_exc.code, int):
        _exit_code = _exc.code
    elif _exc.code is None:
        _exit_code = 0
    else:
        sys.stderr.write(f"{_exc.code}\\n")
        _exit_code = 1
except BaseException as _exc:
    _tb = _exc.__traceback__
    while _tb is not None and _tb.tb_frame.f_code.co_filename == "<string>":
        _tb = _tb.tb_next
    sys.stderr.write("".join(traceback.format_exception(type(_exc), _exc, _tb)))
    _exit_code = 1
finally:
    sys.stdout.flush()
    sys.stderr.flush()
sys.exit(_exit_code)
`.trim();

function defaultLimits(overrides?: Partial<SandboxLimitsConfig>): SandboxLimitsConfig {
  const timeoutRaw = overrides?.timeoutMs ?? LAB_LIMITS.defaultTimeoutMs;
  const timeoutMs = Math.max(250, Math.min(LAB_LIMITS.maxTimeoutMs, timeoutRaw));
  return {
    timeoutMs,
    cpuSeconds: overrides?.cpuSeconds ?? LAB_LIMITS.cpuLimitSeconds,
    memoryBytes: overrides?.memoryBytes ?? LAB_LIMITS.memoryLimitBytes,
    fileBytes: overrides?.fileBytes ?? LAB_LIMITS.maxFileBytes,
    openFiles: overrides?.openFiles ?? LAB_LIMITS.maxOpenFiles,
    maxProcesses: overrides?.maxProcesses ?? LAB_LIMITS.maxProcesses,
    maxOutputBytes: overrides?.maxOutputBytes ?? LAB_LIMITS.maxOutputBytes,
    maxCombinedRunawayBytes: overrides?.maxCombinedRunawayBytes ?? LAB_LIMITS.maxCombinedRunawayBytes,
    tmpfsBytes: overrides?.tmpfsBytes ?? LAB_LIMITS.tmpfsBytes,
  };
}

export function buildBubblewrapArgs(options: {
  pythonPath: string;
  tmpfsBytes: number;
  pathExists?: (path: string) => boolean;
}): string[] {
  const pathExists = options.pathExists ?? defaultPathExists;
  const args = [
    "--unshare-all",
    "--unshare-user",
    "--disable-userns",
    "--assert-userns-disabled",
    "--die-with-parent",
    "--new-session",
    "--cap-drop",
    "ALL",
    "--hostname",
    "sandbox",
    "--ro-bind",
    "/usr",
    "/usr",
  ];

  if (pathExists("/lib")) {
    args.push("--ro-bind", "/lib", "/lib");
  }
  if (pathExists("/lib64")) {
    args.push("--ro-bind", "/lib64", "/lib64");
  } else {
    args.push("--symlink", "usr/lib64", "/lib64");
  }

  args.push(
    "--proc",
    "/proc",
    "--dev",
    "/dev",
    "--size",
    String(options.tmpfsBytes),
    "--tmpfs",
    "/tmp",
    "--dir",
    "/sandbox",
    "--chmod",
    "0555",
    "/sandbox",
    "--chdir",
    "/sandbox",
    "--clearenv",
    "--setenv",
    "PATH",
    "/usr/bin",
    "--setenv",
    "HOME",
    "/sandbox",
    "--setenv",
    "PYTHONDONTWRITEBYTECODE",
    "1",
    "--setenv",
    "PYTHONUTF8",
    "1",
    "--setenv",
    "PYTHONIOENCODING",
    "utf-8",
    options.pythonPath,
    "-I",
    "-c",
    PYTHON_SANDBOX_RUNNER,
  );

  return args;
}

function createSandboxQueue(maxConcurrent: number, maxQueued: number) {
  let active = 0;
  const waiting: { wake: () => void }[] = [];

  return async function withSlot<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) {
      throw new SandboxAbortedError();
    }

    if (active >= maxConcurrent) {
      if (waiting.length >= maxQueued) {
        throw new SandboxBusyError();
      }
      await new Promise<void>((resolve, reject) => {
        let done = false;
        const cleanup = () => signal?.removeEventListener("abort", onAbort);
        const entry = {
          wake: () => {
            if (done) return;
            done = true;
            cleanup();
            resolve();
          },
        };
        const onAbort = () => {
          if (done) return;
          done = true;
          const idx = waiting.indexOf(entry);
          if (idx >= 0) waiting.splice(idx, 1);
          cleanup();
          reject(new SandboxAbortedError());
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        waiting.push(entry);
      });
    }

    if (signal?.aborted) {
      const next = waiting.shift();
      if (next) next.wake();
      throw new SandboxAbortedError();
    }

    active += 1;
    try {
      return await task();
    } finally {
      active -= 1;
      const next = waiting.shift();
      if (next) next.wake();
    }
  };
}

function decodeBoundedBuffers(chunks: Buffer[], maxBytes: number): string {
  if (chunks.length === 0) return "";
  const combined = Buffer.concat(chunks);
  return combined.subarray(0, maxBytes).toString("utf8");
}

function killProcessSafely(child: ChildProcess, signal: NodeJS.Signals) {
  if (typeof child.pid === "number" && child.pid > 0) {
    try {
      process.kill(-child.pid, signal);
    } catch {
      // Grupo já encerrado ou execução simulada sem PGID de sistema.
    }
  }
  try {
    child.kill(signal);
  } catch {
    // Processo já encerrado.
  }
}

export function createSandboxRunner(deps: SandboxDependencies = {}): PythonSandboxRunner {
  const pathExists = deps.pathExists ?? defaultPathExists;
  const spawnFn = deps.spawnProcess ?? defaultSpawnProcess;
  const baseLimits = defaultLimits(deps.limits);
  const runWithSlot = createSandboxQueue(LAB_LIMITS.maxConcurrentRuns, LAB_LIMITS.maxQueuedRuns);

  return {
    execute(input: SandboxExecutionInput): Promise<LabExecutionResult> {
      return runWithSlot(
        () =>
          new Promise<LabExecutionResult>((resolve, reject) => {
            if (input.signal?.aborted) {
              reject(new SandboxAbortedError());
              return;
            }

            const bwrapPath = deps.bwrapPath ?? "/usr/bin/bwrap";
            const pythonPath = deps.pythonPath ?? "/usr/bin/python3";

            if (!pathExists(bwrapPath) || !pathExists(pythonPath) || !pathExists("/usr")) {
              reject(new SandboxUnavailableError());
              return;
            }

            const limits = defaultLimits({ ...baseLimits, ...(input.timeoutMs ? { timeoutMs: input.timeoutMs } : {}) });
            const args = buildBubblewrapArgs({
              pythonPath,
              tmpfsBytes: limits.tmpfsBytes,
              pathExists,
            });

            const startedAt = Date.now();
            let child: ChildProcess;
            try {
              child = spawnFn(bwrapPath, args, {
                stdio: ["pipe", "pipe", "pipe", "pipe"],
                detached: true,
              });
            } catch {
              reject(new SandboxUnavailableError());
              return;
            }

            const stdoutChunks: Buffer[] = [];
            const stderrChunks: Buffer[] = [];
            let stdoutBytes = 0;
            let stderrBytes = 0;
            let combinedRunawayBytes = 0;
            let handshakeText = "";
            let timedOut = false;
            let aborted = false;
            let outputTruncated = false;
            let settled = false;
            let forceKillTimer: ReturnType<typeof setTimeout> | undefined;
            let abortWatchdogTimer: ReturnType<typeof setTimeout> | undefined;

            const onAbort = () => {
              if (settled || aborted) return;
              aborted = true;
              clearTimeout(wallTimer);
              killProcessSafely(child, "SIGKILL");
              abortWatchdogTimer = setTimeout(() => {
                finishError(new SandboxAbortedError());
              }, 300);
            };

            const cleanupListeners = () => {
              clearTimeout(wallTimer);
              clearTimeout(forceKillTimer);
              clearTimeout(abortWatchdogTimer);
              input.signal?.removeEventListener("abort", onAbort);
            };

            const finishError = (err: Error) => {
              if (settled) return;
              settled = true;
              cleanupListeners();
              child.stdin?.destroy();
              child.stdout?.destroy();
              child.stderr?.destroy();
              reject(err);
            };

            const wallTimer = setTimeout(() => {
              timedOut = true;
              killProcessSafely(child, "SIGTERM");
              forceKillTimer = setTimeout(() => killProcessSafely(child, "SIGKILL"), 250);
            }, limits.timeoutMs);

            input.signal?.addEventListener("abort", onAbort, { once: true });

            const killRunawayOutput = () => {
              if (combinedRunawayBytes > limits.maxCombinedRunawayBytes) {
                outputTruncated = true;
                killProcessSafely(child, "SIGKILL");
              }
            };

            child.on("error", () => {
              finishError(aborted ? new SandboxAbortedError() : new SandboxUnavailableError());
            });

            child.stdin?.on("error", () => {
              // Ignora EPIPE caso o processo da sandbox encerre antes de consumir toda a entrada.
            });

            const fd3 = child.stdio[3];
            if (fd3 && "on" in fd3) {
              fd3.on("data", (chunk: Buffer) => {
                if (handshakeText.length < 16) {
                  handshakeText += chunk.toString("utf8");
                }
              });
            }

            child.stdout?.on("data", (chunk: Buffer) => {
              combinedRunawayBytes += chunk.byteLength;
              if (stdoutBytes < limits.maxOutputBytes) {
                const remaining = limits.maxOutputBytes - stdoutBytes;
                stdoutChunks.push(chunk.byteLength > remaining ? chunk.subarray(0, remaining) : chunk);
                stdoutBytes += Math.min(remaining, chunk.byteLength);
                if (chunk.byteLength > remaining) outputTruncated = true;
              } else {
                outputTruncated = true;
              }
              killRunawayOutput();
            });

            child.stderr?.on("data", (chunk: Buffer) => {
              combinedRunawayBytes += chunk.byteLength;
              if (stderrBytes < limits.maxOutputBytes) {
                const remaining = limits.maxOutputBytes - stderrBytes;
                stderrChunks.push(chunk.byteLength > remaining ? chunk.subarray(0, remaining) : chunk);
                stderrBytes += Math.min(remaining, chunk.byteLength);
                if (chunk.byteLength > remaining) outputTruncated = true;
              } else {
                outputTruncated = true;
              }
              killRunawayOutput();
            });

            child.on("close", (code, signal) => {
              if (settled) return;
              settled = true;
              cleanupListeners();

              if (aborted) {
                reject(new SandboxAbortedError());
                return;
              }

              if (handshakeText !== "OK") {
                reject(
                  new SandboxUnavailableError(
                    "O isolamento da sandbox falhou na inicialização; por segurança, o código não foi executado.",
                  ),
                );
                return;
              }

              const durationMs = Math.max(1, Date.now() - startedAt);
              let stderr = decodeBoundedBuffers(stderrChunks, limits.maxOutputBytes);
              if (timedOut && !stderr) {
                stderr = `Tempo limite excedido (${(limits.timeoutMs / 1000).toFixed(1)}s). Verifique possíveis laços infinitos.`;
              } else if (signal === "SIGXCPU" && !stderr) {
                stderr = `Limite de tempo de CPU (${limits.cpuSeconds}s) atingido pela execução.`;
              }

              resolve({
                stdout: decodeBoundedBuffers(stdoutChunks, limits.maxOutputBytes),
                stderr,
                exitCode: code,
                signal: signal ?? null,
                timedOut,
                outputTruncated,
                durationMs,
                isolated: true,
              });
            });

            try {
              const payload = JSON.stringify({
                code: input.code,
                stdin: input.stdin ?? "",
                limits: {
                  cpuSeconds: limits.cpuSeconds,
                  memoryBytes: limits.memoryBytes,
                  fileBytes: limits.fileBytes,
                  openFiles: limits.openFiles,
                  maxProcesses: limits.maxProcesses,
                },
              });
              child.stdin?.end(payload);
            } catch {
              killProcessSafely(child, "SIGKILL");
              finishError(aborted ? new SandboxAbortedError() : new SandboxUnavailableError());
            }
          }),
        input.signal,
      );
    },
  };
}

let defaultRunner: PythonSandboxRunner | null = null;
export function getDefaultSandboxRunner(): PythonSandboxRunner {
  if (!defaultRunner) defaultRunner = createSandboxRunner();
  return defaultRunner;
}

/** Verifica rapidamente se bubblewrap, user namespaces e python3 iniciam a sandbox com sucesso. */
export async function probeSandboxAvailability(deps: SandboxDependencies = {}): Promise<LabSandboxStatus> {
  const pathExists = deps.pathExists ?? defaultPathExists;
  const bwrapPath = deps.bwrapPath ?? "/usr/bin/bwrap";
  const pythonPath = deps.pythonPath ?? "/usr/bin/python3";
  const config = defaultLimits(deps.limits);
  const limits = {
    timeoutMs: config.timeoutMs,
    memoryMb: Math.round(config.memoryBytes / (1024 * 1024)),
    maxOutputKb: Math.round(config.maxOutputBytes / 1024),
    cpuSeconds: config.cpuSeconds,
  };
  const checkedAt = new Date().toISOString();

  if (!pathExists(bwrapPath) || !pathExists(pythonPath) || !pathExists("/usr")) {
    return {
      available: false,
      reason: "Binários de isolamento (bubblewrap ou python3) não encontrados no sistema.",
      checkedAt,
      limits,
    };
  }

  try {
    const probeRunner = createSandboxRunner({
      ...deps,
      limits: { ...deps.limits, timeoutMs: deps.limits?.timeoutMs ?? 1500 },
    });
    const result = await probeRunner.execute({ code: "pass" });
    if (result.isolated && result.exitCode === 0 && !result.timedOut) {
      return { available: true, checkedAt, limits };
    }
    return {
      available: false,
      reason: "A sandbox isolada não concluiu a inicialização mínima esperada.",
      checkedAt,
      limits,
    };
  } catch (error) {
    return {
      available: false,
      reason:
        error instanceof SandboxUnavailableError
          ? error.message
          : "A sandbox isolada (bubblewrap/user namespaces) está indisponível neste ambiente.",
      checkedAt,
      limits,
    };
  }
}
