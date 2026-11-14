export type CodeSpeechMode = "explanation" | "literal";
export type TtsPlaybackStatus = "idle" | "playing" | "paused";

export interface TtsPreferences {
  voiceURI: string;
  rate: number;
  continuous: boolean;
  codeMode: CodeSpeechMode;
}

export interface TtsVoiceInfo {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

export interface SpeechCapabilities {
  supported: boolean;
  pauseSupported: boolean;
  isLinux: boolean;
}

export interface CodeLineNote {
  line: number;
  explanation: string;
}

export interface CodeExplanationInput {
  code: string;
  label?: string;
  explanation?: string;
  lineNotes?: readonly CodeLineNote[];
  expectedOutput?: string;
  expectedError?: string;
  isOutput?: boolean;
}

export interface SpeechUtteranceRequest {
  text: string;
  lang: string;
  rate: number;
  voiceURI: string;
}

export interface SpeechUtteranceHandle {
  onend: (() => void) | null;
  onerror: ((errorCode?: string) => void) | null;
}

export interface SpeechSynthesisPort {
  speak(request: SpeechUtteranceRequest, callbacks: { onEnd: () => void; onError: (errorCode?: string) => void }): void;
  cancel(): void;
  pause?: () => void;
  resume?: () => void;
}

export interface TtsControllerState {
  status: TtsPlaybackStatus;
  activeBlockId: string | null;
  activeBlockLabel: string | null;
  errorMessage: string | null;
}

export interface TtsBlockSource {
  id: string;
  label: string;
  text: string;
}

export const TTS_STORAGE_KEY = "estudo-tts-preferences";
export const TTS_RATE_OPTIONS = [0.75, 0.9, 1, 1.15, 1.25, 1.5, 1.75, 2] as const;

export const DEFAULT_TTS_PREFERENCES: TtsPreferences = {
  voiceURI: "",
  rate: 1,
  continuous: false,
  codeMode: "explanation",
};

export function clampTtsRate(rate: number): number {
  if (!Number.isFinite(rate)) return 1;
  return Math.min(2.5, Math.max(0.5, Number(rate.toFixed(2))));
}

export function parseTtsPreferences(raw: string | null | undefined): TtsPreferences {
  if (!raw) return { ...DEFAULT_TTS_PREFERENCES };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_TTS_PREFERENCES };
    const record = parsed as Record<string, unknown>;
    const voiceURI = typeof record.voiceURI === "string" ? record.voiceURI.slice(0, 300) : DEFAULT_TTS_PREFERENCES.voiceURI;
    const rate = typeof record.rate === "number" ? clampTtsRate(record.rate) : DEFAULT_TTS_PREFERENCES.rate;
    const continuous = typeof record.continuous === "boolean" ? record.continuous : DEFAULT_TTS_PREFERENCES.continuous;
    const codeMode: CodeSpeechMode =
      record.codeMode === "literal" || record.codeMode === "explanation"
        ? record.codeMode
        : DEFAULT_TTS_PREFERENCES.codeMode;
    return { voiceURI, rate, continuous, codeMode };
  } catch {
    return { ...DEFAULT_TTS_PREFERENCES };
  }
}

export function serializeTtsPreferences(preferences: TtsPreferences): string {
  return JSON.stringify({
    voiceURI: preferences.voiceURI,
    rate: clampTtsRate(preferences.rate),
    continuous: Boolean(preferences.continuous),
    codeMode: preferences.codeMode === "literal" ? "literal" : "explanation",
  });
}

export function toStableTtsId(...parts: (string | number)[]): string {
  return parts
    .map((part) =>
      String(part)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean)
    .join(".");
}

function languagePriority(lang: string): number {
  const normalized = lang.toLowerCase();
  if (normalized === "pt-br" || normalized === "pt_br") return 0;
  if (normalized.startsWith("pt")) return 1;
  return 2;
}

export function sortVoicesForPortuguese(voices: readonly TtsVoiceInfo[]): TtsVoiceInfo[] {
  return [...voices].sort((a, b) => {
    const prioDiff = languagePriority(a.lang) - languagePriority(b.lang);
    if (prioDiff !== 0) return prioDiff;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export function resolvePreferredVoice(voices: readonly TtsVoiceInfo[], preferredVoiceURI: string): TtsVoiceInfo | null {
  if (preferredVoiceURI) {
    const exact = voices.find((voice) => voice.voiceURI === preferredVoiceURI);
    if (exact) return exact;
  }
  const sorted = sortVoicesForPortuguese(voices);
  const ptVoice = sorted.find((voice) => languagePriority(voice.lang) < 2);
  if (ptVoice) return ptVoice;
  return sorted.find((voice) => voice.default) ?? sorted[0] ?? null;
}

export function detectSpeechEnvironment(
  speechSynthesisObj: unknown,
  platformOrUserAgent = "",
): SpeechCapabilities {
  const isLinux = /linux/i.test(platformOrUserAgent) && !/android/i.test(platformOrUserAgent);
  if (!speechSynthesisObj || typeof speechSynthesisObj !== "object") {
    return { supported: false, pauseSupported: false, isLinux };
  }
  const candidate = speechSynthesisObj as Record<string, unknown>;
  const supported = typeof candidate.speak === "function" && typeof candidate.cancel === "function";
  const pauseSupported =
    supported &&
    typeof candidate.pause === "function" &&
    typeof candidate.resume === "function";
  return { supported, pauseSupported, isLinux };
}

export function splitSpeechText(rawText: string, maxLength = 220): string[] {
  const normalized = rawText.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  if (normalized.length <= maxLength) return [normalized];

  const chunks: string[] = [];
  let remaining = normalized;

  while (remaining.length > maxLength) {
    const window = remaining.slice(0, maxLength + 1);
    let splitAt = -1;
    const punctuationMatches = [...window.matchAll(/[.!?;:]\s+/g)];
    for (const match of punctuationMatches) {
      if (match.index !== undefined && match.index > 20) {
        splitAt = match.index + 1;
      }
    }
    if (splitAt === -1) {
      const commaIndex = window.lastIndexOf(", ");
      if (commaIndex > 20) splitAt = commaIndex + 1;
    }
    if (splitAt === -1) {
      const spaceIndex = window.lastIndexOf(" ");
      splitAt = spaceIndex > 0 ? spaceIndex : maxLength;
    }
    const part = remaining.slice(0, splitAt).trim();
    if (part) chunks.push(part);
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

const TOKEN_REPLACEMENTS: readonly [RegExp, string][] = [
  [/===/g, " igual estrito "],
  [/!==/g, " diferente estrito "],
  [/==/g, " igual igual "],
  [/!=/g, " diferente de "],
  [/<=/g, " menor ou igual a "],
  [/>=/g, " maior ou igual a "],
  [/\*\*/g, " potência "],
  [/\/\//g, " divisão inteira "],
  [/\+=/g, " mais igual "],
  [/-=/g, " menos igual "],
  [/\*=/g, " vezes igual "],
  [/\/=/g, " dividido igual "],
  [/->/g, " seta "],
  [/=>/g, " seta dupla "],
  [/=/g, " recebe "],
  [/:/g, " dois pontos "],
  [/\(/g, " abre parênteses "],
  [/\)/g, " fecha parênteses "],
  [/\[/g, " abre colchetes "],
  [/\]/g, " fecha colchetes "],
  [/\{/g, " abre chaves "],
  [/\}/g, " fecha chaves "],
  [/</g, " menor que "],
  [/>/g, " maior que "],
  [/\+/g, " mais "],
  [/(?<!\w)-/g, " menos "],
  [/\*/g, " vezes "],
  [/\//g, " dividido por "],
  [/%/g, " módulo "],
];

function speakableCodeLine(line: string): string {
  let result = line.trim();
  for (const [pattern, replacement] of TOKEN_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result.replace(/\s+/g, " ").trim();
}

export function formatCodeForLiteralTts(code: string, label?: string, isOutput = false): string {
  const normalized = code.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const header = label ? `${label}.` : isOutput ? "Saída do código." : "Código literal.";

  if (isOutput) {
    const nonEmpty = lines.map((line) => line.trim()).filter(Boolean);
    if (!nonEmpty.length) return `${header} Sem conteúdo.`;
    const spokenLines = nonEmpty.map((line, index) => `Linha ${index + 1}: ${line}.`);
    return `${header} ${spokenLines.join(" ")}`;
  }

  const parts: string[] = [header];
  lines.forEach((rawLine, index) => {
    if (!rawLine.trim()) {
      parts.push(`Linha ${index + 1}: em branco.`);
      return;
    }
    const leadingSpaces = rawLine.match(/^ */)?.[0].length ?? 0;
    const indentText = leadingSpaces > 0 ? `, recuo de ${leadingSpaces} ${leadingSpaces === 1 ? "espaço" : "espaços"}` : "";
    parts.push(`Linha ${index + 1}${indentText}: ${speakableCodeLine(rawLine)}.`);
  });
  return parts.join(" ");
}

function summarizeCodeStructure(code: string): string {
  const lines = code.replace(/\r\n/g, "\n").split("\n").filter((line) => line.trim().length > 0);
  const features: string[] = [];
  if (/\bdef\s+\w+/.test(code)) features.push("definição de função");
  if (/\bfor\s+/.test(code)) features.push("laço for");
  if (/\bwhile\s+/.test(code)) features.push("laço while");
  if (/\bif\s+/.test(code)) features.push("estrutura condicional");
  if (/\bprint\s*\(/.test(code)) features.push("exibição de saída com print");
  if (/\binput\s*\(/.test(code)) features.push("leitura de entrada com input");
  if (/\[.*\]/.test(code)) features.push("uso de lista ou indexação");
  if (/\{.*\}/.test(code)) features.push("uso de dicionário ou conjunto");
  if (/^\s*[a-zA-Z_]\w*\s*[+\-*/]?=/m.test(code)) features.push("atribuição de variáveis");

  const lineCountLabel = `${lines.length} ${lines.length === 1 ? "linha" : "linhas"}`;
  if (!features.length) {
    return `Trecho de código com ${lineCountLabel}. Ative a leitura literal se desejar ouvir cada símbolo e recuo.`;
  }
  return `Trecho de código com ${lineCountLabel}, contendo ${features.join(", ")}. Para ouvir cada símbolo linha a linha, alterne para leitura literal.`;
}

export function formatCodeForExplanationTts(input: CodeExplanationInput): string {
  const header = input.label ? `${input.label}.` : input.isOutput ? "Resultado." : "Explicação do código.";

  if (input.isOutput) {
    const trimmed = input.code.trim();
    if (!trimmed || trimmed === "(sem saída)") {
      return `${header} Nenhuma saída impressa.`;
    }
    const lines = trimmed.split("\n").filter((line) => line.trim().length > 0);
    if (lines.length === 1) {
      return `${header} O valor apresentado é ${lines[0]}.`;
    }
    return `${header} Apresenta ${lines.length} linhas de resultado: ${lines.join("; ")}.`;
  }

  const sections: string[] = [header];
  if (input.explanation?.trim()) {
    sections.push(input.explanation.trim());
  }
  if (input.lineNotes && input.lineNotes.length > 0) {
    sections.push(
      `Explicação por linha. ${input.lineNotes
        .map((note) => `Linha ${note.line}: ${note.explanation}`)
        .join(" ")}`,
    );
  } else if (!input.explanation?.trim()) {
    sections.push(summarizeCodeStructure(input.code));
  }

  if (input.expectedError) {
    sections.push(`Falha intencional esperada: ${input.expectedError}.`);
  } else if (input.expectedOutput !== undefined) {
    sections.push(
      input.expectedOutput.trim() === ""
        ? "Saída esperada: nenhuma saída impressa."
        : `Saída esperada: ${input.expectedOutput.trim().replace(/\n+/g, "; ")}.`,
    );
  }

  return sections.join(" ");
}

export function formatTableForTts(caption: string, headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const parts: string[] = [caption ? `${caption}.` : "Tabela."];
  rows.forEach((row, rowIndex) => {
    const cells = row.map((value, colIndex) => {
      const colName = headers[colIndex] ?? `Coluna ${colIndex + 1}`;
      return `${colName}: ${value}`;
    });
    parts.push(`Linha ${rowIndex + 1}: ${cells.join("; ")}.`);
  });
  return parts.join(" ");
}

export function describeSpeechError(errorCode?: string): string {
  switch (errorCode) {
    case "not-allowed":
    case "service-not-allowed":
      return "O navegador bloqueou a reprodução automática de áudio. Clique diretamente no botão de ouvir para iniciar.";
    case "voice-unavailable":
    case "language-unavailable":
      return "A voz selecionada não está disponível neste navegador. Escolha outra voz ou use o padrão do sistema.";
    case "synthesis-unavailable":
    case "synthesis-failed":
    case "audio-busy":
    case "audio-hardware":
      return "O sintetizador de voz local não está disponível no momento. Você pode continuar lendo o conteúdo normalmente.";
    default:
      return "Não foi possível reproduzir este trecho em voz alta neste navegador. A leitura textual continua disponível.";
  }
}

export function createTtsController(options: {
  port: SpeechSynthesisPort | null;
  capabilities: SpeechCapabilities;
  getPreferences: () => TtsPreferences;
  getVoices: () => readonly TtsVoiceInfo[];
  getBlock: (id: string) => TtsBlockSource | null;
  getNextBlockId: (currentId: string) => string | null;
  onStateChange: (state: TtsControllerState) => void;
}) {
  let state: TtsControllerState = {
    status: "idle",
    activeBlockId: null,
    activeBlockLabel: null,
    errorMessage: null,
  };
  let sessionId = 0;

  function emit(next: Partial<TtsControllerState>) {
    state = { ...state, ...next };
    options.onStateChange(state);
  }

  function stop(clearError = true) {
    sessionId += 1;
    try {
      options.port?.cancel();
    } catch {
      // Alguns navegadores lançam erro se cancel for chamado sem suporte ativo.
    }
    emit({
      status: "idle",
      activeBlockId: null,
      activeBlockLabel: null,
      errorMessage: clearError ? null : state.errorMessage,
    });
  }

  function playBlock(id: string) {
    if (!options.port || !options.capabilities.supported) {
      emit({
        status: "idle",
        activeBlockId: null,
        activeBlockLabel: null,
        errorMessage: "Leitura em voz alta indisponível neste navegador. Você pode continuar a aula normalmente.",
      });
      return;
    }

    const block = options.getBlock(id);
    if (!block) return;

    const chunks = splitSpeechText(block.text);
    if (!chunks.length) return;

    const currentSession = ++sessionId;
    try {
      options.port.cancel();
    } catch {
      // Ignora erro de cancelamento antes de iniciar nova fala.
    }

    const prefs = options.getPreferences();
    const resolvedVoice = resolvePreferredVoice(options.getVoices(), prefs.voiceURI);

    emit({
      status: "playing",
      activeBlockId: block.id,
      activeBlockLabel: block.label,
      errorMessage: null,
    });

    const speakChunk = (chunkIndex: number) => {
      if (sessionId !== currentSession || !options.port) return;

      const chunk = chunks[chunkIndex];
      if (!chunk) {
        if (options.getPreferences().continuous) {
          const nextId = options.getNextBlockId(block.id);
          if (nextId) {
            playBlock(nextId);
            return;
          }
        }
        emit({ status: "idle", activeBlockId: null, activeBlockLabel: null });
        return;
      }

      options.port.speak(
        {
          text: chunk,
          lang: resolvedVoice?.lang || "pt-BR",
          rate: clampTtsRate(prefs.rate),
          voiceURI: resolvedVoice?.voiceURI ?? prefs.voiceURI,
        },
        {
          onEnd: () => {
            if (sessionId !== currentSession) return;
            speakChunk(chunkIndex + 1);
          },
          onError: (errorCode) => {
            if (sessionId !== currentSession) return;
            if (errorCode === "interrupted" || errorCode === "canceled") return;
            sessionId += 1;
            emit({
              status: "idle",
              activeBlockId: null,
              activeBlockLabel: null,
              errorMessage: describeSpeechError(errorCode),
            });
          },
        },
      );
    };

    speakChunk(0);
  }

  function pause() {
    if (!options.port || !options.capabilities.pauseSupported || state.status !== "playing") return;
    try {
      options.port.pause?.();
      emit({ status: "paused" });
    } catch {
      emit({
        errorMessage: "Este navegador não conseguiu pausar a narração atual. Use Parar para interromper.",
      });
    }
  }

  function resume() {
    if (!options.port || !options.capabilities.pauseSupported || state.status !== "paused") return;
    try {
      options.port.resume?.();
      emit({ status: "playing" });
    } catch {
      emit({
        status: "idle",
        activeBlockId: null,
        activeBlockLabel: null,
        errorMessage: "Não foi possível retomar a narração neste navegador. Clique em Ouvir novamente.",
      });
    }
  }

  return {
    getState: () => state,
    playBlock,
    pause,
    resume,
    stop: () => stop(true),
  };
}
