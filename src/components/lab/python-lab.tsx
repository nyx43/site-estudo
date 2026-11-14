"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eraser,
  FlaskConical,
  Play,
  RotateCcw,
  ShieldCheck,
  Square,
  Terminal,
  XCircle,
} from "lucide-react";
import { StudyClientError, studyRequest } from "@/lib/study/client";
import { toStableTtsId } from "@/lib/study/tts";
import {
  LAB_DRAFTS_STORAGE_KEY,
  buildLabDraftKey,
  parseLabDraftStore,
  serializeLabDraftStore,
  type LabDraftMap,
} from "@/lib/lab/drafts";
import type { PublicLab, PublicLabChallenge } from "@/lib/lab/public";
import { LAB_LIMITS, type LabRunResponse, type LabSandboxStatus } from "@/lib/lab/schema";
import { TtsBlock } from "../study/tts-block";
import { TtsProvider } from "../study/tts-provider";
import { TtsToolbar } from "../study/tts-toolbar";

const EMPTY_DRAFTS: LabDraftMap = {};
let cachedRawDrafts: string | null | undefined;
let cachedDrafts: LabDraftMap = EMPTY_DRAFTS;
const draftListeners = new Set<() => void>();

function notifyDraftListeners() {
  for (const listener of draftListeners) {
    listener();
  }
}

function readDraftSnapshot(): LabDraftMap {
  if (typeof window === "undefined") return EMPTY_DRAFTS;
  try {
    const raw = window.localStorage.getItem(LAB_DRAFTS_STORAGE_KEY);
    if (raw === cachedRawDrafts) return cachedDrafts;
    cachedRawDrafts = raw;
    cachedDrafts = parseLabDraftStore(raw);
    return cachedDrafts;
  } catch {
    return cachedDrafts;
  }
}

function writeDraftStore(next: LabDraftMap) {
  const serialized = serializeLabDraftStore(next);
  cachedRawDrafts = serialized;
  cachedDrafts = parseLabDraftStore(serialized);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LAB_DRAFTS_STORAGE_KEY, serialized);
    } catch {
      // Ignora falha de cota do armazenamento local mantendo estado em memória.
    }
  }
  notifyDraftListeners();
}

function subscribeDrafts(callback: () => void) {
  draftListeners.add(callback);
  if (typeof window === "undefined") {
    return () => {
      draftListeners.delete(callback);
    };
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === LAB_DRAFTS_STORAGE_KEY) {
      cachedRawDrafts = undefined;
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    draftListeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function computeCursorPosition(text: string, selectionStart: number) {
  const prefix = text.slice(0, Math.max(0, selectionStart));
  const lines = prefix.split("\n");
  return {
    line: lines.length,
    col: (lines.at(-1)?.length ?? 0) + 1,
  };
}

export function PythonLab({ lab }: { lab: PublicLab }) {
  const initialChallenge = lab.challenges[0];
  const [activeScope, setActiveScope] = useState<string>(initialChallenge ? initialChallenge.id : "free");
  const [runningMode, setRunningMode] = useState<"run" | "test" | null>(null);
  const [resultsByScope, setResultsByScope] = useState<Record<string, LabRunResponse>>({});
  const [errorsByScope, setErrorsByScope] = useState<Record<string, string>>({});
  const [noticesByScope, setNoticesByScope] = useState<Record<string, string>>({});
  const [tabInsertsSpaces, setTabInsertsSpaces] = useState(false);
  const [tabStatusNotice, setTabStatusNotice] = useState("");
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [sandboxStatus, setSandboxStatus] = useState<Pick<LabSandboxStatus, "available" | "reason"> | null>(null);

  const drafts = useSyncExternalStore(subscribeDrafts, readDraftSnapshot, () => EMPTY_DRAFTS);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const editorId = useId();
  const stdinId = useId();

  const currentChallenge: PublicLabChallenge | null = useMemo(
    () => (activeScope === "free" ? null : lab.challenges.find((item) => item.id === activeScope) ?? null),
    [activeScope, lab.challenges],
  );

  const draftKey = buildLabDraftKey(lab.id, activeScope);
  const savedDraft = drafts[draftKey];
  const starterCode = currentChallenge ? currentChallenge.starterCode : lab.starterFreeCode;
  const starterStdin = currentChallenge ? currentChallenge.defaultStdin : "";
  const code = savedDraft ? savedDraft.code : starterCode;
  const stdin = savedDraft ? savedDraft.stdin : starterStdin;
  const currentResult = resultsByScope[activeScope] ?? null;
  const currentError = errorsByScope[activeScope] ?? "";
  const currentNotice = noticesByScope[activeScope] ?? "";
  const isDirty = code !== starterCode || stdin !== starterStdin;
  const isSandboxUnavailable = sandboxStatus !== null && !sandboxStatus.available;
  const isExecutionDisabled = Boolean(runningMode) || !code.trim() || isSandboxUnavailable;

  const updateDraft = useCallback(
    (nextCode: string, nextStdin: string, passed?: boolean) => {
      const currentMap = readDraftSnapshot();
      const existing = currentMap[draftKey];
      writeDraftStore({
        ...currentMap,
        [draftKey]: {
          code: nextCode.slice(0, LAB_LIMITS.maxCodeChars),
          stdin: nextStdin.slice(0, LAB_LIMITS.maxStdinChars),
          ...(passed !== undefined ? { passed } : existing?.passed ? { passed: true } : {}),
          updatedAt: new Date().toISOString(),
        },
      });
    },
    [draftKey],
  );

  const restoreStarter = () => {
    const currentMap = { ...readDraftSnapshot() };
    delete currentMap[draftKey];
    writeDraftStore(currentMap);
    setCursor({ line: 1, col: 1 });
    setErrorsByScope((prev) => ({ ...prev, [activeScope]: "" }));
  };

  const clearOutput = () => {
    setResultsByScope((prev) => {
      const next = { ...prev };
      delete next[activeScope];
      return next;
    });
    setErrorsByScope((prev) => ({ ...prev, [activeScope]: "" }));
    setNoticesByScope((prev) => ({ ...prev, [activeScope]: "" }));
  };

  const syncCursor = (element: HTMLTextAreaElement) => {
    setCursor(computeCursorPosition(element.value, element.selectionStart ?? 0));
  };

  const cancelExecution = () => {
    abortControllerRef.current?.abort();
  };

  const runLabRequest = async (
    mode: "run" | "test",
    payload: unknown,
    fallbackError: string,
    onSuccess?: (data: LabRunResponse) => void,
  ) => {
    if (runningMode || !code.trim() || isSandboxUnavailable) return;
    const targetScope = activeScope;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setRunningMode(mode);
    setErrorsByScope((prev) => ({ ...prev, [targetScope]: "" }));
    setNoticesByScope((prev) => ({ ...prev, [targetScope]: "" }));

    try {
      const data = await studyRequest<LabRunResponse>("/api/lab/run", payload, {
        signal: controller.signal,
      });
      setResultsByScope((prev) => ({ ...prev, [targetScope]: data }));
      onSuccess?.(data);
    } catch (error) {
      if ((error instanceof DOMException && error.name === "AbortError") || controller.signal.aborted) {
        setNoticesByScope((prev) => ({ ...prev, [targetScope]: "Execução cancelada." }));
      } else if (error instanceof StudyClientError && error.code === "SANDBOX_UNAVAILABLE") {
        setSandboxStatus({ available: false, reason: error.message });
        setErrorsByScope((prev) => ({
          ...prev,
          [targetScope]: error.message,
        }));
      } else {
        setErrorsByScope((prev) => ({
          ...prev,
          [targetScope]: error instanceof Error ? error.message : fallbackError,
        }));
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setRunningMode(null);
    }
  };

  const executeCode = async () => {
    await runLabRequest(
      "run",
      {
        mode: "run",
        code,
        stdin,
      },
      "Não foi possível executar o código.",
    );
  };

  const runChallengeTests = async () => {
    if (!currentChallenge) return;
    const targetCode = code;
    const targetStdin = stdin;
    await runLabRequest(
      "test",
      {
        mode: "test",
        topicId: lab.topicId,
        challengeId: currentChallenge.id,
        code: targetCode,
      },
      "Não foi possível validar os testes automáticos.",
      (data) => {
        if (data.mode === "test") {
          updateDraft(targetCode, targetStdin, data.allPassed);
        }
      },
    );
  };

  const setEditorSelection = (pos: number) => {
    requestAnimationFrame(() => {
      const element = editorRef.current;
      if (!element) return;
      element.setSelectionRange(pos, pos);
      setCursor(computeCursorPosition(element.value, pos));
    });
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void executeCode();
      return;
    }

    const element = event.currentTarget;
    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? 0;

    if (event.key === "Escape" && tabInsertsSpaces) {
      event.preventDefault();
      setTabInsertsSpaces(false);
      setTabStatusNotice("Tab voltou ao modo de navegação entre campos.");
      return;
    }

    if (event.key === "Tab" && tabInsertsSpaces) {
      event.preventDefault();
      if (event.shiftKey) {
        const lineStart = code.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
        const linePrefix = code.slice(lineStart, start);
        const spacesToRemove = Math.min(4, linePrefix.match(/^ */)?.[0].length ?? 0);
        if (spacesToRemove > 0) {
          const next = code.slice(0, lineStart) + code.slice(lineStart + spacesToRemove);
          updateDraft(next, stdin);
          setEditorSelection(Math.max(lineStart, start - spacesToRemove));
        }
        return;
      }
      const next = code.slice(0, start) + "    " + code.slice(end);
      updateDraft(next, stdin);
      setEditorSelection(start + 4);
      return;
    }

    if (event.key === "Enter") {
      const lineStart = code.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
      const lineBeforeCursor = code.slice(lineStart, start);
      const currentIndent = lineBeforeCursor.match(/^ */)?.[0] ?? "";
      const extraIndent = lineBeforeCursor.trimEnd().endsWith(":") ? "    " : "";
      if (currentIndent || extraIndent) {
        event.preventDefault();
        const insertion = `\n${currentIndent}${extraIndent}`;
        const next = code.slice(0, start) + insertion + code.slice(end);
        updateDraft(next, stdin);
        setEditorSelection(start + insertion.length);
      }
    }
  };

  useEffect(() => {
    if (!tabStatusNotice) return;
    const timer = window.setTimeout(() => setTabStatusNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [tabStatusNotice]);

  useEffect(() => {
    const controller = new AbortController();
    const loadSandboxStatus = async () => {
      try {
        const status = await studyRequest<LabSandboxStatus>("/api/lab/status", undefined, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setSandboxStatus({ available: status.available, reason: status.reason });
        }
      } catch (error) {
        if ((error instanceof DOMException && error.name === "AbortError") || controller.signal.aborted) {
          return;
        }
        setSandboxStatus({
          available: false,
          reason:
            error instanceof Error
              ? error.message
              : "Não foi possível verificar a disponibilidade da sandbox no servidor.",
        });
      }
    };
    void loadSandboxStatus();
    return () => {
      controller.abort();
      abortControllerRef.current?.abort();
    };
  }, []);

  const ttsScopeKey = `${lab.id}:${activeScope}`;
  const exitStatusInfo = useMemo(() => {
    if (!currentResult || currentResult.mode !== "run") return null;
    const { execution } = currentResult;
    if (execution.timedOut) {
      return { tone: "error", label: `Tempo limite excedido (${LAB_LIMITS.defaultTimeoutMs / 1000}s)` };
    }
    if (execution.exitCode === 0) {
      return { tone: "ok", label: "Execução concluída (código 0)" };
    }
    return {
      tone: "error",
      label: `Erro na execução (código ${execution.exitCode ?? "?"})`,
    };
  }, [currentResult]);

  return (
    <section className="lab-workspace" aria-label="Área do laboratório Python">
      <div className="lab-mode-bar" role="group" aria-label="Modos e desafios do laboratório">
        {lab.challenges.map((challenge) => {
          const challengeDraft = drafts[buildLabDraftKey(lab.id, challenge.id)];
          const isSelected = activeScope === challenge.id;
          return (
            <button
              key={challenge.id}
              type="button"
              className={`lab-mode-tab ${isSelected ? "selected" : ""}`}
              aria-pressed={isSelected}
              onClick={() => {
                setActiveScope(challenge.id);
                setCursor({ line: 1, col: 1 });
              }}
            >
              <span>{challenge.title}</span>
              {challengeDraft?.passed && (
                <span className="lab-tab-passed" aria-label="Concluído localmente">
                  <CheckCircle2 size={13} aria-hidden="true" />
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          className={`lab-mode-tab ${activeScope === "free" ? "selected" : ""}`}
          aria-pressed={activeScope === "free"}
          onClick={() => {
            setActiveScope("free");
            setCursor({ line: 1, col: 1 });
          }}
        >
          <span>Modo livre</span>
        </button>
      </div>

      <TtsProvider scopeKey={ttsScopeKey}>
        <div className="lab-tts-strip">
          <TtsToolbar compact />
        </div>

        <div className="lab-prompt-panel">
          {currentChallenge ? (
            <TtsBlock
              id={toStableTtsId(`lab-${lab.id}-${currentChallenge.id}-prompt`)}
              label={`enunciado de ${currentChallenge.title}`}
              text={`${currentChallenge.title}. ${currentChallenge.prompt}`}
            >
              <span className="eyebrow">DESAFIO PRÁTICO</span>
              <h2>{currentChallenge.title}</h2>
              <p>{currentChallenge.prompt}</p>
            </TtsBlock>
          ) : (
            <TtsBlock
              id={toStableTtsId(`lab-${lab.id}-free-prompt`)}
              label="orientações do modo livre"
              text={`Modo livre em Python. ${lab.intro}`}
            >
              <span className="eyebrow">EXPERIMENTAÇÃO LIVRE</span>
              <h2>Experimente laços e entradas à vontade</h2>
              <p>Escreva qualquer código em Python 3, teste entradas em stdin e observe os resultados na sandbox.</p>
            </TtsBlock>
          )}

          {currentChallenge?.hint && (
            <details className="lab-hint">
              <summary>Ver dica para o desafio</summary>
              <p>{currentChallenge.hint}</p>
            </details>
          )}
        </div>
      </TtsProvider>

      <div className="lab-grid">
        <div className="lab-editor-card">
          <div className="lab-panel-header">
            <div className="lab-title-group">
              <label htmlFor={editorId}>Código Python</label>
              <span className={`lab-draft-pill ${isDirty ? "dirty" : ""}`}>
                {isDirty ? "Rascunho salvo localmente" : "Código inicial"}
              </span>
            </div>
            <div className="lab-editor-tools">
              <button
                type="button"
                className={`lab-tool-button ${tabInsertsSpaces ? "active" : ""}`}
                aria-pressed={tabInsertsSpaces}
                onClick={() => {
                  const next = !tabInsertsSpaces;
                  setTabInsertsSpaces(next);
                  setTabStatusNotice(
                    next
                      ? "Tab agora insere 4 espaços no editor. Pressione Esc para sair."
                      : "Tab voltou ao modo de navegação entre campos.",
                  );
                }}
              >
                Tab = 4 espaços
              </button>
              <button
                type="button"
                className="lab-tool-button"
                disabled={Boolean(runningMode)}
                onClick={restoreStarter}
              >
                <RotateCcw size={13} aria-hidden="true" />
                Restaurar início
              </button>
            </div>
          </div>

          <textarea
            ref={editorRef}
            id={editorId}
            className="lab-code-input"
            rows={13}
            value={code}
            maxLength={LAB_LIMITS.maxCodeChars}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            aria-describedby={`${editorId}-meta`}
            onChange={(event) => {
              updateDraft(event.target.value, stdin);
              syncCursor(event.currentTarget);
            }}
            onClick={(event) => syncCursor(event.currentTarget)}
            onKeyUp={(event) => syncCursor(event.currentTarget)}
            onSelect={(event) => syncCursor(event.currentTarget)}
            onKeyDown={handleEditorKeyDown}
          />

          <div className="lab-editor-meta" id={`${editorId}-meta`}>
            <span>
              Linha {cursor.line}, Coluna {cursor.col}
            </span>
            <span>
              {code.length}/{LAB_LIMITS.maxCodeChars} caracteres
            </span>
            <span>Ctrl+Enter executa</span>
          </div>
          {tabStatusNotice && (
            <p className="lab-accessibility-note" role="status" aria-live="polite">
              {tabStatusNotice}
            </p>
          )}

          <div className="lab-stdin-box">
            <label htmlFor={stdinId}>Entrada simulada (stdin)</label>
            <p>Uma linha por chamada de input() durante a execução manual.</p>
            <textarea
              id={stdinId}
              className="lab-stdin-input"
              rows={3}
              value={stdin}
              maxLength={LAB_LIMITS.maxStdinChars}
              spellCheck={false}
              placeholder={"Ex.:\n3"}
              onChange={(event) => updateDraft(code, event.target.value)}
            />
          </div>

          {isSandboxUnavailable && (
            <div className="lab-sandbox-unavailable" role="alert">
              <AlertTriangle size={16} aria-hidden="true" />
              <div>
                <strong>Execução temporariamente indisponível</strong>
                <p>
                  {sandboxStatus.reason ?? "A sandbox bubblewrap/Python não está acessível neste ambiente."} Você
                  pode continuar editando o código normalmente; seus rascunhos seguem salvos localmente.
                </p>
              </div>
            </div>
          )}

          <div className="lab-actions">
            <button
              type="button"
              className="button primary"
              disabled={isExecutionDisabled}
              title={isSandboxUnavailable ? "Execução desabilitada: sandbox indisponível." : undefined}
              onClick={executeCode}
            >
              <Play size={14} aria-hidden="true" />
              {runningMode === "run" ? "Executando…" : "Executar código"}
            </button>

            {currentChallenge && (
              <button
                type="button"
                className="button secondary"
                disabled={isExecutionDisabled}
                title={isSandboxUnavailable ? "Execução desabilitada: sandbox indisponível." : undefined}
                onClick={runChallengeTests}
              >
                <FlaskConical size={14} aria-hidden="true" />
                {runningMode === "test"
                  ? "Rodando testes…"
                  : `Rodar testes (${currentChallenge.tests.length})`}
              </button>
            )}

            {runningMode && (
              <button
                type="button"
                className="button lab-cancel-button"
                onClick={cancelExecution}
              >
                <Square size={13} aria-hidden="true" />
                Cancelar
              </button>
            )}
          </div>
        </div>

        <div className="lab-output-card" role="region" aria-label="Console de saída e testes" aria-busy={Boolean(runningMode)}>
          <div className="lab-panel-header">
            <div className="lab-title-group">
              <Terminal size={15} aria-hidden="true" />
              <h3>Console e verificação</h3>
            </div>
            {(currentResult || currentError || currentNotice) && (
              <button type="button" className="lab-tool-button" onClick={clearOutput}>
                <Eraser size={13} aria-hidden="true" />
                Limpar saída
              </button>
            )}
          </div>

          {currentError && (
            <div className="lab-alert-error" role="alert">
              <AlertTriangle size={16} aria-hidden="true" />
              <p>{currentError}</p>
            </div>
          )}

          {currentNotice && !runningMode && (
            <div className="lab-cancel-notice" role="status" aria-live="polite">
              <Square size={14} aria-hidden="true" />
              <p>{currentNotice}</p>
            </div>
          )}

          {!currentResult && !currentError && !currentNotice && !runningMode && (
            <div className="lab-empty-console">
              <ShieldCheck size={20} aria-hidden="true" />
              <p>
                Clique em <strong>Executar código</strong> para ver stdout/stderr ou em{" "}
                <strong>Rodar testes</strong> para conferir sua solução contra os casos automáticos.
              </p>
            </div>
          )}

          {runningMode && (
            <div className="lab-empty-console" aria-live="polite">
              <Terminal size={20} aria-hidden="true" />
              <p>Executando em sandbox Python isolada sem acesso à rede ou aos arquivos do projeto…</p>
            </div>
          )}

          {!runningMode && currentResult?.mode === "run" && (
            <div className="lab-console-result" aria-live="polite">
              <div className="lab-status-badges">
                <span className="lab-badge sandbox">
                  <ShieldCheck size={12} aria-hidden="true" />
                  Sandbox isolada
                </span>
                {exitStatusInfo && (
                  <span className={`lab-badge ${exitStatusInfo.tone}`}>{exitStatusInfo.label}</span>
                )}
                <span className="lab-badge neutral">{currentResult.execution.durationMs} ms</span>
                {currentResult.execution.outputTruncated && (
                  <span className="lab-badge warn">Saída truncada em {LAB_LIMITS.maxOutputBytes / 1024} KB</span>
                )}
              </div>

              <div className="lab-stream-block">
                <span className="eyebrow">SAÍDA PADRÃO (STDOUT)</span>
                <pre className="lab-stream" data-testid="lab-stdout">
                  {currentResult.execution.stdout || "(Nenhuma saída produzida em stdout)"}
                </pre>
              </div>

              {currentResult.execution.stderr && (
                <div className="lab-stream-block">
                  <span className="eyebrow">SAÍDA DE ERRO (STDERR)</span>
                  <pre className="lab-stream lab-stderr" data-testid="lab-stderr">
                    {currentResult.execution.stderr}
                  </pre>
                </div>
              )}
            </div>
          )}

          {!runningMode && currentResult?.mode === "test" && (
            <div className="lab-tests-result" aria-live="polite">
              <div
                className={`lab-test-summary ${currentResult.allPassed ? "passed" : "failed"}`}
                data-testid="lab-test-summary"
              >
                {currentResult.allPassed ? (
                  <CheckCircle2 size={18} aria-hidden="true" />
                ) : (
                  <XCircle size={18} aria-hidden="true" />
                )}
                <div>
                  <strong>
                    {currentResult.allPassed
                      ? "Todos os testes automáticos passaram!"
                      : `${currentResult.passedCount} de ${currentResult.totalCount} testes passaram`}
                  </strong>
                  <p>
                    {currentResult.allPassed
                      ? "Sua solução atendeu todos os casos definidos para este desafio."
                      : "Compare a saída esperada com a obtida nos casos abaixo e ajuste seu código."}
                  </p>
                </div>
              </div>

              <ol className="lab-test-list">
                {currentResult.results.map((testCase) => (
                  <li key={testCase.id} className={`lab-test-case ${testCase.passed ? "passed" : "failed"}`}>
                    <div className="lab-test-case-top">
                      <strong>{testCase.name}</strong>
                      <div className="lab-test-case-meta">
                        <span className="lab-badge neutral">{testCase.durationMs} ms</span>
                        <span className={`lab-badge ${testCase.passed ? "ok" : "error"}`}>
                          {testCase.passed ? "Passou" : "Falhou"}
                        </span>
                      </div>
                    </div>
                    <p>{testCase.description}</p>
                    <div className="lab-test-io-grid">
                      <div>
                        <span className="eyebrow">ENTRADA (STDIN)</span>
                        <pre>{testCase.stdin.replace(/\n$/, "") || "(vazia)"}</pre>
                      </div>
                      <div>
                        <span className="eyebrow">ESPERADO</span>
                        <pre>{testCase.expectedOutput}</pre>
                      </div>
                      <div>
                        <span className="eyebrow">OBTIDO</span>
                        <pre>{testCase.actualOutput || "(vazio)"}</pre>
                      </div>
                    </div>
                    {(testCase.stderr || testCase.timedOut || testCase.outputTruncated) && (
                      <div className="lab-test-error-detail">
                        {testCase.timedOut && <span>Tempo limite excedido neste caso.</span>}
                        {testCase.outputTruncated && <span>Saída excedeu o limite de captura.</span>}
                        {testCase.stderr && <pre>{testCase.stderr}</pre>}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
