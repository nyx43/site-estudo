import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_TTS_PREFERENCES,
  clampTtsRate,
  createTtsController,
  detectSpeechEnvironment,
  formatCodeForExplanationTts,
  formatCodeForLiteralTts,
  formatTableForTts,
  parseTtsPreferences,
  resolvePreferredVoice,
  serializeTtsPreferences,
  sortVoicesForPortuguese,
  splitSpeechText,
  toStableTtsId,
  type SpeechSynthesisPort,
  type SpeechUtteranceRequest,
  type TtsBlockSource,
  type TtsControllerState,
  type TtsPreferences,
  type TtsVoiceInfo,
} from "@/lib/study/tts";

function createFakeSpeechPort() {
  const spoken: { request: SpeechUtteranceRequest; onEnd: () => void; onError: (code?: string) => void }[] = [];
  const cancel = vi.fn();
  const pause = vi.fn();
  const resume = vi.fn();

  const port: SpeechSynthesisPort = {
    speak(request, callbacks) {
      spoken.push({ request, ...callbacks });
    },
    cancel,
    pause,
    resume,
  };

  return { port, spoken, cancel, pause, resume };
}

describe("TTS preferences and IDs", () => {
  it("parses valid preferences and restores safe defaults for corrupted input", () => {
    expect(parseTtsPreferences(null)).toEqual(DEFAULT_TTS_PREFERENCES);
    expect(parseTtsPreferences("{invalid")).toEqual(DEFAULT_TTS_PREFERENCES);
    expect(clampTtsRate(Number.NaN)).toBe(1);
    expect(clampTtsRate(10)).toBe(2.5);
    expect(clampTtsRate(0.1)).toBe(0.5);

    const serialized = serializeTtsPreferences({
      voiceURI: "pt-br-local",
      rate: 1.5,
      continuous: true,
      codeMode: "literal",
    });

    expect(parseTtsPreferences(serialized)).toEqual({
      voiceURI: "pt-br-local",
      rate: 1.5,
      continuous: true,
      codeMode: "literal",
    });
  });

  it("produces deterministic accent-free block identifiers", () => {
    const idA = toStableTtsId("python.condicionais.v2", "Comando: if / elif", "Exemplo 1");
    const idB = toStableTtsId("python.condicionais.v2", "Comando: if / elif", "Exemplo 1");
    expect(idA).toBe(idB);
    expect(idA).toBe("python-condicionais-v2.comando-if-elif.exemplo-1");
  });
});

describe("Voice selection and environment capabilities", () => {
  const voices: TtsVoiceInfo[] = [
    { voiceURI: "en-us", name: "English US", lang: "en-US", localService: true, default: true },
    { voiceURI: "pt-pt", name: "Português PT", lang: "pt-PT", localService: true, default: false },
    { voiceURI: "pt-br", name: "Português Brasil", lang: "pt-BR", localService: true, default: false },
  ];

  it("prioritizes pt-BR and pt voices ahead of other languages", () => {
    expect(sortVoicesForPortuguese(voices).map((v) => v.voiceURI)).toEqual(["pt-br", "pt-pt", "en-us"]);
    expect(resolvePreferredVoice(voices, "")?.voiceURI).toBe("pt-br");
    expect(resolvePreferredVoice(voices, "en-us")?.voiceURI).toBe("en-us");
    expect(resolvePreferredVoice(voices, "missing-uri")?.voiceURI).toBe("pt-br");
  });

  it("detects Web Speech capabilities and Linux pause quirks safely", () => {
    expect(detectSpeechEnvironment(undefined, "Linux x86_64")).toEqual({
      supported: false,
      pauseSupported: false,
      isLinux: true,
    });

    expect(detectSpeechEnvironment({ speak: () => {}, cancel: () => {} }, "Mozilla/5.0 X11; Linux x86_64")).toEqual({
      supported: true,
      pauseSupported: false,
      isLinux: true,
    });

    expect(
      detectSpeechEnvironment(
        { speak: () => {}, cancel: () => {}, pause: () => {}, resume: () => {} },
        "Linux; Android 14",
      ),
    ).toEqual({
      supported: true,
      pauseSupported: true,
      isLinux: false,
    });
  });
});

describe("Text and code formatting for speech", () => {
  it("splits long paragraphs near sentence boundaries", () => {
    const longText =
      "Primeira frase explicando variáveis em Python com detalhes suficientes. " +
      "Segunda frase mostrando que o texto deve ser quebrado em partes menores para evitar travamentos no Linux. " +
      "Terceira frase finalizando o exemplo sem truncar conteúdo importante.";

    const chunks = splitSpeechText(longText, 120);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks.every((chunk) => chunk.length <= 120)).toBe(true);
    expect(chunks.join(" ")).toContain("Primeira frase");
    expect(chunks.join(" ")).toContain("Terceira frase");
  });

  it("formats Python code literally with lines, indentation and operators", () => {
    const code = "nota = 7\nif nota >= 6:\n    print(nota)";
    const text = formatCodeForLiteralTts(code, "Código completo");
    expect(text).toContain("Código completo.");
    expect(text).toContain("Linha 1: nota recebe 7.");
    expect(text).toContain("Linha 2: if nota maior ou igual a 6 dois pontos.");
    expect(text).toContain("Linha 3, recuo de 4 espaços: print abre parênteses nota fecha parênteses.");
  });

  it("formats code explanations from metadata and falls back to structural summary", () => {
    const explained = formatCodeForExplanationTts({
      code: "x = 10\nprint(x)",
      label: "Código completo",
      explanation: "Guarda o valor e exibe na tela.",
      lineNotes: [
        { line: 1, explanation: "Atribui 10 à variável x." },
        { line: 2, explanation: "Imprime o valor atual de x." },
      ],
      expectedOutput: "10",
    });
    expect(explained).toContain("Guarda o valor e exibe na tela.");
    expect(explained).toContain("Linha 1: Atribui 10 à variável x.");
    expect(explained).toContain("Saída esperada: 10.");

    const structural = formatCodeForExplanationTts({
      code: "for item in lista:\n    print(item)",
      label: "Trecho",
    });
    expect(structural).toContain("2 linhas");
    expect(structural).toContain("laço for");
    expect(structural).toContain("leitura literal");

    const output = formatCodeForExplanationTts({
      code: "aprovado",
      label: "Saída",
      isOutput: true,
    });
    expect(output).toBe("Saída. O valor apresentado é aprovado.");
  });

  it("formats trace tables cleanly for speech", () => {
    const spoken = formatTableForTts("Rastreamento do exemplo", ["Passo", "Valor"], [["1", "10"]]);
    expect(spoken).toBe("Rastreamento do exemplo. Linha 1: Passo: 1; Valor: 10.");
  });
});

describe("TTS playback controller", () => {
  it("starts, interrupts previous narration on switch, pauses, resumes and stops", () => {
    const { port, spoken, cancel, pause, resume } = createFakeSpeechPort();
    const blocks = new Map<string, TtsBlockSource>([
      ["b1", { id: "b1", label: "Bloco 1", text: "Primeiro parágrafo de estudo." }],
      ["b2", { id: "b2", label: "Bloco 2", text: "Segundo parágrafo da aula." }],
    ]);
    let prefs: TtsPreferences = { voiceURI: "", rate: 1.25, continuous: false, codeMode: "explanation" };
    let latestState: TtsControllerState = {
      status: "idle",
      activeBlockId: null,
      activeBlockLabel: null,
      errorMessage: null,
    };

    const controller = createTtsController({
      port,
      capabilities: { supported: true, pauseSupported: true, isLinux: false },
      getPreferences: () => prefs,
      getVoices: () => [{ voiceURI: "pt-br", name: "Voz BR", lang: "pt-BR", localService: true, default: true }],
      getBlock: (id) => blocks.get(id) ?? null,
      getNextBlockId: (id) => (id === "b1" ? "b2" : null),
      onStateChange: (next) => {
        latestState = next;
      },
    });

    controller.playBlock("b1");
    expect(latestState).toMatchObject({ status: "playing", activeBlockId: "b1", errorMessage: null });
    expect(spoken).toHaveLength(1);
    expect(spoken[0].request).toMatchObject({ rate: 1.25, lang: "pt-BR", voiceURI: "pt-br" });

    controller.playBlock("b2");
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(latestState).toMatchObject({ status: "playing", activeBlockId: "b2" });
    expect(spoken).toHaveLength(2);

    // Late onEnd from cancelled block must be ignored
    spoken[0].onEnd();
    expect(latestState).toMatchObject({ status: "playing", activeBlockId: "b2" });

    controller.pause();
    expect(pause).toHaveBeenCalledTimes(1);
    expect(latestState).toMatchObject({ status: "paused", activeBlockId: "b2" });

    controller.resume();
    expect(resume).toHaveBeenCalledTimes(1);
    expect(latestState).toMatchObject({ status: "playing", activeBlockId: "b2" });

    controller.stop();
    expect(latestState).toMatchObject({ status: "idle", activeBlockId: null });

    // Continuous playback advances cleanly from b1 to b2
    prefs = { ...prefs, continuous: true };
    controller.playBlock("b1");
    expect(spoken).toHaveLength(3);
    spoken[2].onEnd();
    expect(spoken).toHaveLength(4);
    expect(latestState).toMatchObject({ status: "playing", activeBlockId: "b2" });
    spoken[3].onEnd();
    expect(latestState).toMatchObject({ status: "idle", activeBlockId: null });
  });

  it("ignores canceled/interrupted errors and surfaces real synthesis failures safely", () => {
    const { port, spoken } = createFakeSpeechPort();
    let latestState: TtsControllerState = {
      status: "idle",
      activeBlockId: null,
      activeBlockLabel: null,
      errorMessage: null,
    };

    const controller = createTtsController({
      port,
      capabilities: { supported: true, pauseSupported: false, isLinux: true },
      getPreferences: () => DEFAULT_TTS_PREFERENCES,
      getVoices: () => [],
      getBlock: () => ({ id: "b1", label: "Bloco", text: "Texto de teste." }),
      getNextBlockId: () => null,
      onStateChange: (next) => {
        latestState = next;
      },
    });

    controller.playBlock("b1");
    // pause should be a no-op when pauseSupported is false
    controller.pause();
    expect(latestState).toMatchObject({ status: "playing" });

    // interrupted should not raise user-facing error
    spoken[0].onError("interrupted");
    expect(latestState).toMatchObject({ errorMessage: null });

    spoken[0].onError("not-allowed");
    expect(latestState).toMatchObject({
      status: "idle",
      activeBlockId: null,
    });
    expect(latestState?.errorMessage).toContain("bloqueou");
  });
});
