"use client";

import { Pause, Play, Square, Volume2, VolumeX } from "lucide-react";
import { TTS_RATE_OPTIONS, type CodeSpeechMode } from "@/lib/study/tts";
import { useTts } from "./tts-provider";

export function TtsToolbar({ compact = false }: { compact?: boolean }) {
  const tts = useTts();
  if (!tts) return null;

  const { state, preferences, voices, capabilities, hydrated, playFirstBlock, pause, resume, stop, updatePreferences } =
    tts;

  const isPlaying = state.status === "playing";
  const isPaused = state.status === "paused";
  const isBusyAudio = isPlaying || isPaused;
  const supported = !hydrated || capabilities.supported;

  const statusText = !hydrated
    ? "Carregando controles de áudio…"
    : !capabilities.supported
      ? "Leitura em voz alta indisponível neste navegador."
      : isPlaying
        ? `Lendo: ${state.activeBlockLabel ?? "bloco selecionado"}`
        : isPaused
          ? `Pausado: ${state.activeBlockLabel ?? "bloco selecionado"}`
          : "Clique em Ouvir em qualquer bloco ou inicie do começo.";

  return (
    <section
      className={`tts-toolbar ${compact ? "tts-toolbar-compact" : ""}`}
      aria-label="Controles de leitura em voz alta"
    >
      <div className="tts-toolbar-top">
        <div className="tts-status">
          {supported ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
          <div>
            <span className="eyebrow">LEITURA EM VOZ ALTA (LOCAL)</span>
            <p aria-live="polite">{statusText}</p>
          </div>
        </div>

        <div className="tts-primary-controls">
          {isPaused ? (
            <button
              type="button"
              className="button secondary tts-control-btn"
              disabled={!capabilities.supported || !capabilities.pauseSupported}
              onClick={resume}
            >
              <Play size={14} aria-hidden="true" /> Continuar
            </button>
          ) : (
            <button
              type="button"
              className="button secondary tts-control-btn"
              disabled={!hydrated || !capabilities.supported || isPlaying}
              onClick={playFirstBlock}
            >
              <Play size={14} aria-hidden="true" /> Iniciar leitura
            </button>
          )}

          {(!hydrated || capabilities.pauseSupported) && (
            <button
              type="button"
              className="button secondary tts-control-btn"
              disabled={!hydrated || !capabilities.supported || !capabilities.pauseSupported || !isPlaying}
              onClick={pause}
            >
              <Pause size={14} aria-hidden="true" /> Pausar
            </button>
          )}

          <button
            type="button"
            className="button secondary tts-control-btn"
            disabled={!hydrated || !isBusyAudio}
            onClick={stop}
          >
            <Square size={14} aria-hidden="true" /> Parar
          </button>
        </div>
      </div>

      <div className="tts-settings-row">
        <label className="tts-field">
          <span>Voz</span>
          <select
            aria-label="Voz da leitura"
            disabled={!hydrated || !capabilities.supported}
            value={preferences.voiceURI}
            onChange={(event) => updatePreferences({ voiceURI: event.target.value })}
          >
            <option value="">
              {voices.length > 0 ? "Padrão do navegador (pt-BR prioritário)" : "Padrão do sistema (sem lista de vozes)"}
            </option>
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </label>

        <label className="tts-field tts-field-rate">
          <span>Velocidade</span>
          <select
            aria-label="Velocidade da leitura"
            disabled={!hydrated || !capabilities.supported}
            value={String(preferences.rate)}
            onChange={(event) => updatePreferences({ rate: Number(event.target.value) })}
          >
            {TTS_RATE_OPTIONS.map((rate) => (
              <option key={rate} value={String(rate)}>
                {rate}x
              </option>
            ))}
          </select>
        </label>

        <label className="tts-field tts-field-codemode">
          <span>Códigos</span>
          <select
            aria-label="Modo de leitura de código"
            disabled={!hydrated || !capabilities.supported}
            value={preferences.codeMode}
            onChange={(event) => updatePreferences({ codeMode: event.target.value as CodeSpeechMode })}
          >
            <option value="explanation">Explicação textual</option>
            <option value="literal">Leitura literal</option>
          </select>
        </label>

        <button
          type="button"
          role="switch"
          aria-checked={preferences.continuous}
          className={`tts-switch ${preferences.continuous ? "selected" : ""}`}
          disabled={!hydrated || !capabilities.supported}
          onClick={() => updatePreferences({ continuous: !preferences.continuous })}
        >
          <span className="tts-switch-track" aria-hidden="true">
            <span className="tts-switch-thumb" />
          </span>
          <span>Leitura contínua</span>
        </button>
      </div>

      {hydrated && !capabilities.supported && (
        <p className="tts-note" role="status">
          Este navegador não expõe a API local de síntese de voz (Web Speech API). Todo o conteúdo escrito e os exercícios continuam funcionando normalmente.
        </p>
      )}

      {hydrated && capabilities.supported && voices.length === 0 && (
        <p className="tts-note" role="status">
          {capabilities.isLinux
            ? "Nenhuma voz local foi listada pelo navegador. No Linux, a disponibilidade de vozes e a pausa dependem do navegador e do serviço local (como speech-dispatcher). A leitura escrita da aula segue disponível normalmente."
            : "Nenhuma voz local foi listada pelo navegador. Você ainda pode tentar iniciar com a voz padrão do sistema ou continuar usando a aula normalmente."}
        </p>
      )}

      {hydrated && capabilities.supported && !capabilities.pauseSupported && (
        <p className="tts-note">
          Este navegador não suporta pausar e retomar a síntese; utilize Parar para interromper a leitura.
        </p>
      )}

      {state.errorMessage && (
        <p className="tts-error" role="status">
          {state.errorMessage}
        </p>
      )}
    </section>
  );
}
