import { expect, test, type Page } from "@playwright/test";

interface SpokenRecord {
  text: string;
  lang: string;
  rate: number;
  voiceURI: string;
}

interface TtsMockApi {
  spoken: SpokenRecord[];
  cancelCount: number;
  pauseCount: number;
  resumeCount: number;
  finishCurrent: () => boolean;
}

declare global {
  interface Window {
    __ttsMock?: TtsMockApi;
  }
}

async function installSpeechMock(page: Page, options?: { supported?: boolean; withPause?: boolean }) {
  const supported = options?.supported ?? true;
  const withPause = options?.withPause ?? true;

  await page.addInitScript(
    ({ isSupported, enablePause }) => {
      if (!isSupported) {
        Object.defineProperty(window, "speechSynthesis", {
          value: undefined,
          configurable: true,
          writable: true,
        });
        return;
      }

      const voices = [
        { voiceURI: "mock-pt-br", name: "Maria Local", lang: "pt-BR", localService: true, default: true },
        { voiceURI: "mock-en-us", name: "Alex Local", lang: "en-US", localService: true, default: false },
      ];

      interface MockUtteranceShape {
        text: string;
        lang: string;
        rate: number;
        voice: { voiceURI?: string } | null;
        onend: ((ev: Event) => void) | null;
        onerror: ((ev: { error?: string }) => void) | null;
      }

      class MockSpeechSynthesisUtterance implements MockUtteranceShape {
        text: string;
        lang = "pt-BR";
        rate = 1;
        voice: { voiceURI?: string } | null = null;
        onend: ((ev: Event) => void) | null = null;
        onerror: ((ev: { error?: string }) => void) | null = null;

        constructor(text = "") {
          this.text = text;
        }
      }

      let currentUtterance: MockUtteranceShape | null = null;
      const recorder: TtsMockApi = {
        spoken: [],
        cancelCount: 0,
        pauseCount: 0,
        resumeCount: 0,
        finishCurrent() {
          const active = currentUtterance;
          if (!active) return false;
          currentUtterance = null;
          mockSynth.speaking = false;
          mockSynth.paused = false;
          active.onend?.(new Event("end"));
          return true;
        },
      };

      const listeners = new Set<() => void>();
      const mockSynth: Record<string, unknown> = {
        speaking: false,
        paused: false,
        pending: false,
        onvoiceschanged: null,
        addEventListener(type: string, cb: () => void) {
          if (type === "voiceschanged") listeners.add(cb);
        },
        removeEventListener(type: string, cb: () => void) {
          if (type === "voiceschanged") listeners.delete(cb);
        },
        getVoices() {
          return voices;
        },
        speak(utterance: MockUtteranceShape) {
          currentUtterance = utterance;
          mockSynth.speaking = true;
          mockSynth.paused = false;
          recorder.spoken.push({
            text: utterance.text,
            lang: utterance.lang,
            rate: utterance.rate,
            voiceURI: utterance.voice?.voiceURI ?? "",
          });
        },
        cancel() {
          recorder.cancelCount += 1;
          currentUtterance = null;
          mockSynth.speaking = false;
          mockSynth.paused = false;
        },
      };

      if (enablePause) {
        mockSynth.pause = () => {
          recorder.pauseCount += 1;
          mockSynth.paused = true;
        };
        mockSynth.resume = () => {
          recorder.resumeCount += 1;
          mockSynth.paused = false;
        };
      }

      window.__ttsMock = recorder;
      Object.defineProperty(window, "SpeechSynthesisUtterance", {
        value: MockSpeechSynthesisUtterance,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(window, "speechSynthesis", {
        value: mockSynth,
        configurable: true,
        writable: true,
      });
    },
    { isSupported: supported, enablePause: withPause },
  );
}

test.describe("TTS per-block reading", () => {
  test("reads individual blocks, switches cleanly, pauses/resumes and stops", async ({ page }) => {
    await installSpeechMock(page);
    await page.goto("/aulas/python.variaveis-e-tipos");

    const objetivosBlock = page.locator('[data-tts-id$=".objetivos"]');
    const prerequisitosBlock = page.locator('[data-tts-id$=".prerequisitos"]');

    await objetivosBlock.getByRole("button", { name: /Ouvir/i }).click();
    await expect(objetivosBlock).toHaveAttribute("data-tts-active", "true");
    await expect(page.locator('[data-tts-active="true"]')).toHaveCount(1);
    await expect(page.locator(".tts-status")).toContainText("Lendo: Objetivos da aula");

    const spokenAfterFirst = await page.evaluate(() => window.__ttsMock?.spoken.length ?? 0);
    expect(spokenAfterFirst).toBeGreaterThan(0);

    // Pause and resume via toolbar
    const toolbar = page.getByRole("region", { name: "Controles de leitura em voz alta" });
    await toolbar.getByRole("button", { name: "Pausar" }).click();
    await expect(page.locator(".tts-status")).toContainText("Pausado: Objetivos da aula");
    await toolbar.getByRole("button", { name: "Continuar" }).click();
    await expect(page.locator(".tts-status")).toContainText("Lendo: Objetivos da aula");

    // Switching to another block cancels previous and updates highlight
    await prerequisitosBlock.getByRole("button", { name: /Ouvir/i }).click();
    await expect(prerequisitosBlock).toHaveAttribute("data-tts-active", "true");
    await expect(objetivosBlock).not.toHaveAttribute("data-tts-active", "true");
    await expect(page.locator('[data-tts-active="true"]')).toHaveCount(1);

    const mockStats = await page.evaluate(() => window.__ttsMock);
    expect(mockStats?.pauseCount).toBe(1);
    expect(mockStats?.resumeCount).toBe(1);
    expect(mockStats?.cancelCount).toBeGreaterThanOrEqual(2);

    await toolbar.getByRole("button", { name: "Parar" }).click();
    await expect(page.locator('[data-tts-active="true"]')).toHaveCount(0);
    await expect(page.locator(".tts-status")).toContainText("Clique em Ouvir em qualquer bloco");
  });

  test("persists preferences and toggles literal vs explanation code reading", async ({ page }) => {
    await installSpeechMock(page);
    await page.goto("/aulas/python.condicionais");

    const voiceSelect = page.getByLabel("Voz da leitura");
    const rateSelect = page.getByLabel("Velocidade da leitura");
    const codeModeSelect = page.getByLabel("Modo de leitura de código");
    const continuousCheckbox = page.getByRole("switch", { name: "Leitura contínua" });

    await voiceSelect.selectOption("mock-en-us");
    await rateSelect.selectOption("1.5");
    await codeModeSelect.selectOption("literal");
    await continuousCheckbox.check();

    await page.reload();

    await expect(page.getByLabel("Voz da leitura")).toHaveValue("mock-en-us");
    await expect(page.getByLabel("Velocidade da leitura")).toHaveValue("1.5");
    await expect(page.getByLabel("Modo de leitura de código")).toHaveValue("literal");
    await expect(page.getByRole("switch", { name: "Leitura contínua" })).toBeChecked();

    const firstCodeBlock = page.locator(".code-example[data-tts-id]").first();
    await firstCodeBlock.scrollIntoViewIfNeeded();
    await firstCodeBlock.getByRole("button", { name: /Ouvir/i }).click();
    await expect(firstCodeBlock).toHaveAttribute("data-tts-active", "true");

    const literalSpoken = await page.evaluate(() => {
      const spoken = window.__ttsMock?.spoken ?? [];
      return spoken[spoken.length - 1];
    });
    expect(literalSpoken?.rate).toBe(1.5);
    expect(literalSpoken?.voiceURI).toBe("mock-en-us");
    expect(literalSpoken?.text).toContain("Linha 1");

    // Switch this block to Explicação
    await firstCodeBlock.getByRole("button", { name: "Explicação" }).click();
    const explanationSpoken = await page.evaluate(() => {
      const spoken = window.__ttsMock?.spoken ?? [];
      return spoken.map((item) => item.text).join(" ");
    });
    expect(explanationSpoken).toMatch(/Explicação por linha|Saída esperada|Trecho de código/);
  });

  test("advances continuously through blocks when continuous mode is enabled", async ({ page }) => {
    await installSpeechMock(page);
    await page.goto("/aulas/python.variaveis-e-tipos");

    await page.getByRole("switch", { name: "Leitura contínua" }).check();
    await page.getByRole("button", { name: "Iniciar leitura" }).click();

    await expect(page.locator('[data-tts-id$=".objetivos"]')).toHaveAttribute("data-tts-active", "true");

    // Drain chunks of first block until active block moves to .prerequisitos
    for (let i = 0; i < 8; i++) {
      const activeId = await page.locator('[data-tts-active="true"]').getAttribute("data-tts-id");
      if (activeId?.endsWith(".prerequisitos")) break;
      await page.evaluate(() => window.__ttsMock?.finishCurrent());
    }

    await expect(page.locator('[data-tts-id$=".prerequisitos"]')).toHaveAttribute("data-tts-active", "true");
  });

  test("works inside guided study, stops audio on step change and supports dark/mobile layouts", async ({ page }) => {
    await installSpeechMock(page);
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/estudar/python.condicionais");

    const step1Btn = page.locator(".study-outline ol li button").first();
    const eyebrow = page.locator(".reader-topline .eyebrow");
    if ((await eyebrow.count()) === 0 || (await eyebrow.textContent()) !== "PARTE 1 DE 10") {
      await step1Btn.click();
    }
    await expect(eyebrow).toHaveText("PARTE 1 DE 10");

    // Toggle dark theme via keyboard and ensure layout has no horizontal overflow
    const themeToggle = page.locator("button.theme-toggle");
    await themeToggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const preqIntro = page.locator('[data-tts-id$=".prequestions.intro"]');
    const preqButton = preqIntro.getByRole("button", { name: /Ouvir/i });
    await preqButton.focus();
    await page.keyboard.press("Enter");
    await expect(preqIntro).toHaveAttribute("data-tts-active", "true");

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    // Complete step 1 (if pending) or move to step 2 -> must stop active narration cleanly
    const completeBtn = page.getByRole("button", { name: /Concluir parte e continuar/i });
    if (await completeBtn.isDisabled()) {
      const cards = page.locator(".question-card");
      const count = await cards.count();
      for (let idx = 0; idx < count; idx++) {
        const card = cards.nth(idx);
        const saveBtn = card.getByRole("button", { name: "Salvar resposta" });
        if (await saveBtn.isVisible()) {
          await card.locator("textarea").fill(`Resposta de teste para verificar TTS na etapa inicial ${idx + 1}.`);
          await saveBtn.click();
          await expect(card.getByRole("button", { name: "Resposta salva" })).toBeVisible();
        }
      }
      await completeBtn.click();
    } else {
      await completeBtn.click();
    }

    await expect(eyebrow).toHaveText("PARTE 2 DE 10");
    await expect(page.locator('[data-tts-active="true"]')).toHaveCount(0);
  });

  test("degrades gracefully when Web Speech API is unavailable", async ({ page }) => {
    await installSpeechMock(page, { supported: false });
    await page.goto("/aulas/python.listas-e-dicionarios");

    await expect(
      page.getByText(/não expõe a API local de síntese de voz/i),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar leitura" })).toBeDisabled();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
