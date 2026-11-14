"use client";

import { useEffect, useState } from "react";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import {
  formatCodeForExplanationTts,
  formatCodeForLiteralTts,
  type CodeLineNote,
  type CodeSpeechMode,
} from "@/lib/study/tts";
import { useTts } from "./tts-provider";

export function CodeBlock({
  children,
  label,
  ttsId,
  explanation,
  lineNotes,
  expectedOutput,
  expectedError,
  isOutput = false,
}: {
  children: string;
  label?: string;
  ttsId?: string;
  explanation?: string;
  lineNotes?: readonly CodeLineNote[];
  expectedOutput?: string;
  expectedError?: string;
  isOutput?: boolean;
}) {
  const tts = useTts();
  const registerBlock = tts?.registerBlock;
  const globalMode = tts?.preferences.codeMode ?? "explanation";
  const [localOverride, setLocalOverride] = useState<{ base: CodeSpeechMode; mode: CodeSpeechMode } | null>(null);
  const blockMode = localOverride && localOverride.base === globalMode ? localOverride.mode : globalMode;

  useEffect(() => {
    if (!registerBlock || !ttsId) return;
    return registerBlock({
      id: ttsId,
      label: label ?? (isOutput ? "Saída do código" : "Bloco de código"),
      getText: (requestedMode) => {
        const effectiveMode =
          localOverride && localOverride.base === globalMode ? localOverride.mode : requestedMode;
        if (effectiveMode === "literal") {
          return formatCodeForLiteralTts(children, label, isOutput);
        }
        return formatCodeForExplanationTts({
          code: children,
          label,
          explanation,
          lineNotes,
          expectedOutput,
          expectedError,
          isOutput,
        });
      },
    });
  }, [registerBlock, ttsId, label, children, explanation, lineNotes, expectedOutput, expectedError, isOutput, localOverride, globalMode]);

  const isActive = Boolean(ttsId && tts?.state.activeBlockId === ttsId);
  const isPaused = isActive && tts?.state.status === "paused";
  const canUseTts = Boolean(tts && ttsId && tts.hydrated && tts.capabilities.supported);
  const blockLabel = label ?? (isOutput ? "Saída" : "Código");

  function handleSelectMode(nextMode: CodeSpeechMode) {
    setLocalOverride({ base: globalMode, mode: nextMode });
    if (isActive && ttsId && tts) {
      tts.playBlock(ttsId, nextMode);
    }
  }

  return (
    <div
      className={`code-example ${isActive ? "tts-block-active" : ""}`.trim()}
      data-tts-id={tts && ttsId ? ttsId : undefined}
      data-tts-active={isActive ? "true" : undefined}
    >
      {(label || (tts && ttsId)) && (
        <div className="code-example-header">
          <span className="code-example-label">{label ?? (isOutput ? "Saída" : "Código")}</span>
          {tts && ttsId && (
            <div className="code-tts-controls">
              {!isOutput && (
                <div className="code-mode-toggle" role="group" aria-label={`Modo de áudio para ${blockLabel}`}>
                  <button
                    type="button"
                    aria-pressed={blockMode === "explanation"}
                    className={blockMode === "explanation" ? "selected" : ""}
                    onClick={() => handleSelectMode("explanation")}
                  >
                    Explicação
                  </button>
                  <button
                    type="button"
                    aria-pressed={blockMode === "literal"}
                    className={blockMode === "literal" ? "selected" : ""}
                    onClick={() => handleSelectMode("literal")}
                  >
                    Literal
                  </button>
                </div>
              )}
              {!isActive ? (
                <button
                  type="button"
                  className="tts-trigger tts-code-trigger"
                  disabled={!canUseTts}
                  aria-label={`Ouvir ${blockLabel}`}
                  onClick={() => tts.playBlock(ttsId, blockMode)}
                >
                  <Volume2 size={13} aria-hidden="true" />
                  <span>Ouvir</span>
                </button>
              ) : (
                <div className="tts-active-controls">
                  {tts.capabilities.pauseSupported && (
                    <button
                      type="button"
                      className="tts-trigger tts-code-trigger tts-trigger-active"
                      aria-label={isPaused ? `Continuar ${blockLabel}` : `Pausar ${blockLabel}`}
                      onClick={() => (isPaused ? tts.resume() : tts.pause())}
                    >
                      {isPaused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
                      <span>{isPaused ? "Continuar" : "Pausar"}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="tts-trigger tts-code-trigger tts-trigger-stop"
                    aria-label={`Parar leitura de ${blockLabel}`}
                    onClick={tts.stop}
                  >
                    <Square size={12} aria-hidden="true" />
                    <span>Parar</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <pre>
        <code>{children}</code>
      </pre>
    </div>
  );
}
