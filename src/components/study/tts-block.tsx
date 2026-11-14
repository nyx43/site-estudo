"use client";

import { useEffect } from "react";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import type { CodeSpeechMode } from "@/lib/study/tts";
import { useTts } from "./tts-provider";

export function TtsBlock({
  id,
  label,
  text,
  getText,
  className = "",
  as: Tag = "div",
  children,
}: {
  id: string;
  label: string;
  text?: string;
  getText?: (mode: CodeSpeechMode) => string;
  className?: string;
  as?: "div" | "section" | "li" | "article";
  children: React.ReactNode;
}) {
  const tts = useTts();
  const registerBlock = tts?.registerBlock;

  useEffect(() => {
    if (!registerBlock) return;
    return registerBlock({
      id,
      label,
      getText: (mode) => (getText ? getText(mode) : text ?? ""),
    });
  }, [registerBlock, id, label, text, getText]);

  const isActive = tts?.state.activeBlockId === id;
  const isPlaying = isActive && tts?.state.status === "playing";
  const isPaused = isActive && tts?.state.status === "paused";
  const canUseTts = Boolean(tts && tts.hydrated && tts.capabilities.supported);

  return (
    <Tag
      className={`tts-block ${isActive ? "tts-block-active" : ""} ${className}`.trim()}
      data-tts-id={tts ? id : undefined}
      data-tts-active={isActive ? "true" : undefined}
    >
      <div className="tts-block-body">{children}</div>
      {tts && (
        <div className="tts-block-actions">
          {!isActive ? (
            <button
              type="button"
              className="tts-trigger"
              disabled={!canUseTts}
              aria-label={`Ouvir ${label}`}
              onClick={() => tts.playBlock(id)}
            >
              <Volume2 size={13} aria-hidden="true" />
              <span>Ouvir</span>
            </button>
          ) : (
            <div className="tts-active-controls" role="group" aria-label={`Controles de áudio para ${label}`}>
              {tts.capabilities.pauseSupported && (
                <button
                  type="button"
                  className="tts-trigger tts-trigger-active"
                  aria-label={isPaused ? `Continuar ${label}` : `Pausar ${label}`}
                  onClick={() => (isPaused ? tts.resume() : tts.pause())}
                >
                  {isPaused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
                  <span>{isPaused ? "Continuar" : "Pausar"}</span>
                </button>
              )}
              <button
                type="button"
                className="tts-trigger tts-trigger-stop"
                aria-label={`Parar leitura de ${label}`}
                onClick={tts.stop}
              >
                <Square size={12} aria-hidden="true" />
                <span>{isPlaying ? "Parar" : "Encerrar"}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </Tag>
  );
}
