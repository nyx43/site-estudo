"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import {
  DEFAULT_TTS_PREFERENCES,
  TTS_STORAGE_KEY,
  createTtsController,
  detectSpeechEnvironment,
  parseTtsPreferences,
  serializeTtsPreferences,
  sortVoicesForPortuguese,
  type CodeSpeechMode,
  type SpeechCapabilities,
  type SpeechSynthesisPort,
  type TtsControllerState,
  type TtsPreferences,
  type TtsVoiceInfo,
} from "@/lib/study/tts";

interface BlockRegistration {
  id: string;
  label: string;
  getText: (mode: CodeSpeechMode) => string;
}

interface TtsContextValue {
  state: TtsControllerState;
  preferences: TtsPreferences;
  voices: TtsVoiceInfo[];
  capabilities: SpeechCapabilities;
  hydrated: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  registerBlock: (registration: BlockRegistration) => () => void;
  playBlock: (id: string, overrideCodeMode?: CodeSpeechMode) => void;
  playFirstBlock: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  updatePreferences: (patch: Partial<TtsPreferences>) => void;
}

const TtsContext = createContext<TtsContextValue | null>(null);

const DEFAULT_CAPABILITIES: SpeechCapabilities = {
  supported: false,
  pauseSupported: false,
  isLinux: false,
};

const EMPTY_VOICES: TtsVoiceInfo[] = [];

let cachedVoicesSignature = "";
let cachedVoicesSnapshot: TtsVoiceInfo[] = EMPTY_VOICES;

function readBrowserVoices(): TtsVoiceInfo[] {
  if (typeof window === "undefined") return EMPTY_VOICES;
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof synth.getVoices !== "function") return EMPTY_VOICES;
    const rawVoices = synth.getVoices();
    const mapped: TtsVoiceInfo[] = rawVoices.map((voice) => ({
      voiceURI: voice.voiceURI,
      name: voice.name,
      lang: voice.lang,
      localService: voice.localService,
      default: voice.default,
    }));
    const sorted = sortVoicesForPortuguese(mapped);
    const signature = sorted.map((v) => `${v.voiceURI}|${v.name}|${v.lang}|${v.default}`).join(";;");
    if (signature !== cachedVoicesSignature) {
      cachedVoicesSignature = signature;
      cachedVoicesSnapshot = sorted;
    }
    return cachedVoicesSnapshot;
  } catch {
    return EMPTY_VOICES;
  }
}

function subscribeVoices(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const synth = window.speechSynthesis;
  if (!synth || typeof synth.getVoices !== "function") return () => {};
  const handler = () => {
    callback();
  };
  if (typeof synth.addEventListener === "function") {
    synth.addEventListener("voiceschanged", handler);
  }
  const previous = synth.onvoiceschanged;
  synth.onvoiceschanged = handler;
  return () => {
    if (typeof synth.removeEventListener === "function") {
      synth.removeEventListener("voiceschanged", handler);
    }
    if (synth.onvoiceschanged === handler) {
      synth.onvoiceschanged = previous ?? null;
    }
  };
}

let cachedCapabilities: SpeechCapabilities | null = null;
function readCapabilitiesSnapshot(): SpeechCapabilities {
  if (typeof window === "undefined") return DEFAULT_CAPABILITIES;
  if (!cachedCapabilities) {
    const platformHint = `${navigator.platform ?? ""} ${navigator.userAgent ?? ""}`;
    cachedCapabilities = detectSpeechEnvironment(window.speechSynthesis, platformHint);
  }
  return cachedCapabilities;
}

function subscribeHydration() {
  return () => {};
}

let inMemoryPreferences: TtsPreferences = DEFAULT_TTS_PREFERENCES;
let loadedStorage = false;
const preferenceListeners = new Set<() => void>();

function readPreferencesSnapshot(): TtsPreferences {
  if (typeof window === "undefined") return DEFAULT_TTS_PREFERENCES;
  if (!loadedStorage) {
    loadedStorage = true;
    try {
      inMemoryPreferences = parseTtsPreferences(window.localStorage.getItem(TTS_STORAGE_KEY));
    } catch {
      inMemoryPreferences = DEFAULT_TTS_PREFERENCES;
    }
  }
  return inMemoryPreferences;
}

function subscribePreferences(callback: () => void) {
  preferenceListeners.add(callback);
  if (typeof window === "undefined") {
    return () => {
      preferenceListeners.delete(callback);
    };
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== TTS_STORAGE_KEY) return;
    loadedStorage = false;
    readPreferencesSnapshot();
    preferenceListeners.forEach((listener) => listener());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    preferenceListeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function writeStoredPreferences(next: TtsPreferences) {
  inMemoryPreferences = next;
  loadedStorage = true;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(TTS_STORAGE_KEY, serializeTtsPreferences(next));
    } catch {
      // A leitura em voz alta continua funcionando nesta página sem persistência local.
    }
  }
  preferenceListeners.forEach((listener) => listener());
}

function createBrowserSpeechPort(): SpeechSynthesisPort | null {
  if (typeof window === "undefined") return null;
  const synth = window.speechSynthesis;
  if (!synth || typeof synth.speak !== "function" || typeof synth.cancel !== "function") return null;

  return {
    speak(request, callbacks) {
      const UtteranceCtor = window.SpeechSynthesisUtterance;
      if (typeof UtteranceCtor !== "function") {
        callbacks.onError("synthesis-unavailable");
        return;
      }
      const utterance = new UtteranceCtor(request.text);
      utterance.lang = request.lang;
      utterance.rate = request.rate;
      if (request.voiceURI) {
        try {
          const match = synth.getVoices().find((voice) => voice.voiceURI === request.voiceURI);
          if (match) utterance.voice = match;
        } catch {
          // Ignora erro de listagem de vozes durante atribuição.
        }
      }
      utterance.onend = () => callbacks.onEnd();
      utterance.onerror = (event) => callbacks.onError(event?.error);
      synth.speak(utterance);
    },
    cancel() {
      synth.cancel();
    },
    ...(typeof synth.pause === "function" ? { pause: () => synth.pause() } : {}),
    ...(typeof synth.resume === "function" ? { resume: () => synth.resume() } : {}),
  };
}

export function TtsProvider({
  scopeKey,
  children,
}: {
  scopeKey: string;
  children: React.ReactNode;
}) {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const voices = useSyncExternalStore(subscribeVoices, readBrowserVoices, () => EMPTY_VOICES);
  const capabilities = useSyncExternalStore(
    subscribeHydration,
    readCapabilitiesSnapshot,
    () => DEFAULT_CAPABILITIES,
  );
  const preferences = useSyncExternalStore(
    subscribePreferences,
    readPreferencesSnapshot,
    () => DEFAULT_TTS_PREFERENCES,
  );

  const [state, setState] = useState<TtsControllerState>({
    status: "idle",
    activeBlockId: null,
    activeBlockLabel: null,
    errorMessage: null,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const blocksRef = useRef(new Map<string, BlockRegistration>());
  const overrideModeRef = useRef<CodeSpeechMode | null>(null);
  const preferencesRef = useRef(preferences);
  const voicesRef = useRef(voices);
  const capabilitiesRef = useRef(capabilities);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    voicesRef.current = voices;
  }, [voices]);

  useEffect(() => {
    capabilitiesRef.current = capabilities;
  }, [capabilities]);

  const getOrderedBlockIds = useCallback(() => {
    const container = containerRef.current;
    if (!container) return [...blocksRef.current.keys()];
    const nodes = container.querySelectorAll<HTMLElement>("[data-tts-id]");
    const ordered: string[] = [];
    for (const node of nodes) {
      const id = node.dataset.ttsId;
      if (id && blocksRef.current.has(id) && !ordered.includes(id)) {
        ordered.push(id);
      }
    }
    return ordered;
  }, []);

  const controllerRef = useRef<ReturnType<typeof createTtsController> | null>(null);

  const ensureController = useCallback(() => {
    if (controllerRef.current) return controllerRef.current;
    const port = createBrowserSpeechPort();
    const controller = createTtsController({
      port,
      capabilities: capabilitiesRef.current,
      getPreferences: () => preferencesRef.current,
      getVoices: () => voicesRef.current,
      getBlock: (id) => {
        const reg = blocksRef.current.get(id);
        if (!reg) return null;
        const mode = overrideModeRef.current ?? preferencesRef.current.codeMode;
        const text = reg.getText(mode);
        return { id: reg.id, label: reg.label, text };
      },
      getNextBlockId: (currentId) => {
        overrideModeRef.current = null;
        const ordered = getOrderedBlockIds();
        const index = ordered.indexOf(currentId);
        if (index === -1) return null;
        for (let i = index + 1; i < ordered.length; i += 1) {
          const candidateId = ordered[i];
          const reg = blocksRef.current.get(candidateId);
          if (reg && reg.getText(preferencesRef.current.codeMode).trim().length > 0) {
            return candidateId;
          }
        }
        return null;
      },
      onStateChange: (nextState) => {
        setState(nextState);
        if (nextState.status === "playing" && nextState.activeBlockId && containerRef.current) {
          const escaped =
            typeof CSS !== "undefined" && typeof CSS.escape === "function"
              ? CSS.escape(nextState.activeBlockId)
              : nextState.activeBlockId.replace(/"/g, '\\"');
          const el = containerRef.current.querySelector<HTMLElement>(`[data-tts-id="${escaped}"]`);
          if (el && typeof el.scrollIntoView === "function") {
            const reducedMotion =
              typeof window !== "undefined" &&
              typeof window.matchMedia === "function" &&
              window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            el.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
          }
        }
      },
    });
    controllerRef.current = controller;
    return controller;
  }, [getOrderedBlockIds]);

  useEffect(() => {
    return () => {
      overrideModeRef.current = null;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignora falha ao cancelar síntese ao desmontar ou mudar de página.
        }
      }
      controllerRef.current = null;
    };
  }, [scopeKey]);

  const registerBlock = useCallback((registration: BlockRegistration) => {
    blocksRef.current.set(registration.id, registration);
    return () => {
      blocksRef.current.delete(registration.id);
    };
  }, []);

  const playBlock = useCallback(
    (id: string, overrideCodeMode?: CodeSpeechMode) => {
      overrideModeRef.current = overrideCodeMode ?? null;
      ensureController().playBlock(id);
    },
    [ensureController],
  );

  const playFirstBlock = useCallback(() => {
    const ordered = getOrderedBlockIds();
    const firstValid = ordered.find((id) => {
      const reg = blocksRef.current.get(id);
      return Boolean(reg && reg.getText(preferencesRef.current.codeMode).trim().length > 0);
    });
    if (firstValid) {
      playBlock(firstValid);
    }
  }, [getOrderedBlockIds, playBlock]);

  const pause = useCallback(() => {
    ensureController().pause();
  }, [ensureController]);

  const resume = useCallback(() => {
    ensureController().resume();
  }, [ensureController]);

  const stop = useCallback(() => {
    overrideModeRef.current = null;
    ensureController().stop();
  }, [ensureController]);

  const updatePreferences = useCallback((patch: Partial<TtsPreferences>) => {
    const current = readPreferencesSnapshot();
    writeStoredPreferences({
      ...current,
      ...patch,
    });
  }, []);

  const value = useMemo<TtsContextValue>(
    () => ({
      state,
      preferences,
      voices,
      capabilities,
      hydrated,
      containerRef,
      registerBlock,
      playBlock,
      playFirstBlock,
      pause,
      resume,
      stop,
      updatePreferences,
    }),
    [
      state,
      preferences,
      voices,
      capabilities,
      hydrated,
      registerBlock,
      playBlock,
      playFirstBlock,
      pause,
      resume,
      stop,
      updatePreferences,
    ],
  );

  return (
    <TtsContext.Provider value={value}>
      <div ref={containerRef} className="tts-scope">
        {children}
      </div>
    </TtsContext.Provider>
  );
}

export function useTts() {
  return useContext(TtsContext);
}
