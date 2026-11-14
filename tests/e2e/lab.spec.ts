import { expect, test, type Page } from "@playwright/test";

async function installLabSpeechMock(page: Page) {
  await page.addInitScript(() => {
    const voices = [{ voiceURI: "mock-pt-br", name: "Maria Local", lang: "pt-BR", localService: true, default: true }];
    class MockUtterance {
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
    const spoken: string[] = [];
    let current: MockUtterance | null = null;
    const synth = {
      speaking: false,
      paused: false,
      pending: false,
      getVoices: () => voices,
      addEventListener: () => {},
      removeEventListener: () => {},
      speak(utterance: MockUtterance) {
        current = utterance;
        synth.speaking = true;
        spoken.push(utterance.text);
      },
      cancel() {
        current = null;
        synth.speaking = false;
        synth.paused = false;
      },
      pause() {
        synth.paused = true;
      },
      resume() {
        synth.paused = false;
      },
    };
    Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true, writable: true });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: MockUtterance,
      configurable: true,
      writable: true,
    });
    (window as unknown as { __labTtsSpoken: string[]; __finishLabTts: () => void }).__labTtsSpoken = spoken;
    (window as unknown as { __labTtsSpoken: string[]; __finishLabTts: () => void }).__finishLabTts = () => {
      const active = current;
      current = null;
      synth.speaking = false;
      active?.onend?.(new Event("end"));
    };
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, viewportWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);
}

test("navegação, execução com stdin, stderr, persistência de rascunho e testes automáticos no laboratório", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "mobile") {
    await page.setViewportSize({ width: 360, height: 800 });
  }

  await page.goto("/aulas/python.lacos-de-repeticao");
  await expect(page.getByRole("link", { name: /Laboratório Python/ })).toBeVisible();
  await page.getByRole("link", { name: /Laboratório Python/ }).click();

  await expect(page.getByRole("heading", { name: "Laboratório: Laços de repetição em Python" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Executa no Modo livre primeiro e valida saída real
  await page.getByRole("button", { name: "Modo livre" }).click();
  await page.getByRole("button", { name: "Executar código" }).click();
  await expect(page.getByTestId("lab-stdout")).toContainText("1. Python");
  await expect(page.getByTestId("lab-stdout")).toContainText("3. HTML");
  await expect(page.getByText("Execução concluída (código 0)")).toBeVisible();

  // Volta ao Desafio 1 e valida stderr de erro de execução
  await page.getByRole("button", { name: /1\. Contagem regressiva/ }).click();
  const codeEditor = page.getByLabel("Código Python");
  const stdinEditor = page.getByLabel("Entrada simulada (stdin)");

  await codeEditor.fill("print(10 / 0)");
  await page.getByRole("button", { name: "Executar código" }).click();
  await expect(page.getByTestId("lab-stderr")).toContainText('File "codigo.py"');
  await expect(page.getByTestId("lab-stderr")).toContainText("ZeroDivisionError");

  // Testa persistência local de rascunho após reload + restauração do código inicial
  await codeEditor.fill("n = int(input())\nprint(f'Teste {n}')");
  await stdinEditor.fill("9");
  await page.reload();
  await expect(page.getByLabel("Código Python")).toHaveValue("n = int(input())\nprint(f'Teste {n}')");
  await expect(page.getByLabel("Entrada simulada (stdin)")).toHaveValue("9");

  await page.getByRole("button", { name: "Restaurar início" }).click();
  await expect(page.getByLabel("Entrada simulada (stdin)")).toHaveValue("3");

  // Roda testes automáticos com código incompleto -> falha esperada
  await page.getByRole("button", { name: /Rodar testes \(3\)/ }).click();
  await expect(page.getByTestId("lab-test-summary")).toContainText("0 de 3 testes passaram");

  // Envia solução correta, executa com stdin e valida 3/3 testes automáticos
  await page.getByLabel("Código Python").fill(
    "n = int(input())\nfor numero in range(n, 0, -1):\n    print(numero)\nprint(\"Fogo!\")",
  );
  await page.getByLabel("Entrada simulada (stdin)").fill("2");
  await page.getByRole("button", { name: "Executar código" }).click();
  await expect(page.getByTestId("lab-stdout")).toHaveText("2\n1\nFogo!");

  await page.getByRole("button", { name: /Rodar testes \(3\)/ }).click();
  await expect(page.getByTestId("lab-test-summary")).toContainText("Todos os testes automáticos passaram!");
  await expect(page.getByLabel("Concluído localmente")).toBeVisible();

  await expectNoHorizontalOverflow(page);
});

test("acessibilidade de teclado, TTS do enunciado e temas claro/escuro no laboratório", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "mobile") {
    await page.setViewportSize({ width: 360, height: 800 });
  }
  await installLabSpeechMock(page);

  await page.goto("/laboratorio/python.lacos-de-repeticao");
  await expect(page.getByRole("heading", { name: "1. Contagem regressiva" })).toBeVisible();

  // TTS funciona no enunciado do desafio e destaca o bloco ativo
  const listenButton = page.getByRole("button", { name: /Ouvir enunciado de 1\. Contagem regressiva/ });
  await expect(listenButton).toBeEnabled();
  await listenButton.click();
  await expect(page.locator(".tts-block-active")).toContainText("1. Contagem regressiva");
  const spoken = await page.evaluate(
    () => (window as unknown as { __labTtsSpoken: string[] }).__labTtsSpoken.length,
  );
  expect(spoken).toBeGreaterThanOrEqual(1);
  await page.evaluate(() => (window as unknown as { __finishLabTts: () => void }).__finishLabTts());

  // Tab não aprisiona foco por padrão; modo Tab = 4 espaços pode ser ativado e desligado com Escape
  const codeEditor = page.getByLabel("Código Python");
  await codeEditor.focus();
  await page.keyboard.press("Tab");
  const stillFocusedInCode = await codeEditor.evaluate((el) => document.activeElement === el);
  expect(stillFocusedInCode).toBe(false);

  await page.getByRole("button", { name: "Tab = 4 espaços" }).click();
  await codeEditor.fill("");
  await codeEditor.focus();
  await page.keyboard.press("Tab");
  await expect(codeEditor).toHaveValue("    ");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("status").filter({ hasText: "Tab voltou ao modo de navegação" })).toBeVisible();

  // Tema escuro alterna normalmente sem overflow
  await page.getByRole("button", { name: /Modo escuro/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expectNoHorizontalOverflow(page);
});
