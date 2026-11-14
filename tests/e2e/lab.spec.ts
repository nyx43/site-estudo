import { expect, test, type Page } from "@playwright/test";
import { assertSandboxAvailable, readSandboxSkipDirective } from "../sandbox-policy";

const sandboxPolicy = readSandboxSkipDirective("tests/e2e/lab.spec.ts");

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

async function openLab(page: Page) {
  await page.goto("/laboratorio/python.lacos-de-repeticao");
  await expect(page.getByRole("heading", { name: "Laboratório: Laços de repetição em Python" })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, viewportWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);
}

test("navegação da aula de laços para o laboratório preserva rota e conteúdo", async ({ page }) => {
  await page.goto("/aulas/python.lacos-de-repeticao");
  const labLink = page.getByRole("link", { name: /Laboratório Python/ });
  await expect(labLink).toBeVisible();
  await labLink.click();

  await expect(page).toHaveURL(/\/laboratorio\/python\.lacos-de-repeticao$/);
  await expect(page.getByRole("heading", { name: "Laboratório: Laços de repetição em Python" })).toBeVisible();
});

test("persistência de rascunho de código e stdin após recarregar e restauração inicial", async ({ page }) => {
  await openLab(page);

  const codeEditor = page.getByLabel("Código Python");
  const stdinEditor = page.getByLabel("Entrada simulada (stdin)");

  await codeEditor.fill("n = int(input())\nprint(f'Teste {n}')");
  await stdinEditor.fill("9");
  await page.reload();

  await expect(page.getByLabel("Código Python")).toHaveValue("n = int(input())\nprint(f'Teste {n}')");
  await expect(page.getByLabel("Entrada simulada (stdin)")).toHaveValue("9");
  await expect(page.getByText("Rascunho salvo localmente")).toBeVisible();

  await page.getByRole("button", { name: "Restaurar início" }).click();
  await expect(page.getByLabel("Entrada simulada (stdin)")).toHaveValue("3");
  await expect(page.getByText("Código inicial")).toBeVisible();
});

test("leitura em voz alta (TTS) narra e destaca enunciado do desafio", async ({ page }) => {
  await installLabSpeechMock(page);
  await openLab(page);

  const listenButton = page.getByRole("button", { name: /Ouvir enunciado de 1\. Contagem regressiva/ });
  await expect(listenButton).toBeEnabled();
  await listenButton.click();

  await expect(page.locator(".tts-block-active")).toContainText("1. Contagem regressiva");
  const spokenCount = await page.evaluate(
    () => (window as unknown as { __labTtsSpoken: string[] }).__labTtsSpoken.length,
  );
  expect(spokenCount).toBeGreaterThanOrEqual(1);

  await page.evaluate(() => (window as unknown as { __finishLabTts: () => void }).__finishLabTts());
});

test("navegação por teclado no editor evita armadilha de Tab e aceita modo de 4 espaços com Esc", async ({
  page,
}) => {
  await openLab(page);

  const codeEditor = page.getByLabel("Código Python");
  await codeEditor.focus();
  await page.keyboard.press("Tab");
  const stayedOnEditor = await codeEditor.evaluate((el) => document.activeElement === el);
  expect(stayedOnEditor).toBe(false);

  await page.getByRole("button", { name: "Tab = 4 espaços" }).click();
  await codeEditor.fill("");
  await codeEditor.focus();
  await page.keyboard.press("Tab");
  await expect(codeEditor).toHaveValue("    ");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("status").filter({ hasText: "Tab voltou ao modo de navegação" })).toBeVisible();
});

test("alternância para tema escuro preserva estrutura do laboratório", async ({ page }) => {
  await openLab(page);

  await page.getByRole("button", { name: /Modo escuro/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Executar código" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("viewport estreita de 360px não gera transbordamento horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openLab(page);

  await expect(page.getByRole("heading", { name: "1. Contagem regressiva" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Modo livre" }).click();
  await expectNoHorizontalOverflow(page);
});

test("sandbox indisponível desabilita execução com explicação clara mantendo edição e rascunhos", async ({
  page,
}) => {
  await page.route("**/api/lab/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          available: false,
          reason: "user namespaces bloqueados nesta máquina de teste.",
          checkedAt: "2026-11-13T22:00:00.000Z",
          limits: { timeoutMs: 2500, memoryMb: 128, maxOutputKb: 16, cpuSeconds: 2 },
        },
        meta: { version: 1 },
      }),
    });
  });

  await openLab(page);

  const alertBanner = page.getByRole("alert").filter({ hasText: "Execução temporariamente indisponível" });
  await expect(alertBanner).toBeVisible();
  await expect(alertBanner).toContainText("user namespaces bloqueados");

  const runButton = page.getByRole("button", { name: "Executar código" });
  const testsButton = page.getByRole("button", { name: /Rodar testes/ });
  await expect(runButton).toBeDisabled();
  await expect(testsButton).toBeDisabled();

  const codeEditor = page.getByLabel("Código Python");
  await expect(codeEditor).toBeEnabled();
  await codeEditor.fill("print('rascunho offline funcionando')");
  await page.reload();
  await expect(page.getByLabel("Código Python")).toHaveValue("print('rascunho offline funcionando')");
});

test.describe("execução real Python na sandbox bubblewrap", () => {
  test.beforeAll(async () => {
    await assertSandboxAvailable("tests/e2e/lab.spec.ts");
  });

  test.beforeEach(() => {
    test.skip(sandboxPolicy.shouldSkip, sandboxPolicy.warning ?? "SANDBOX_TESTS=skip");
  });

  test("modo livre executa código inicial e exibe saída com código 0", async ({ page }) => {
    await openLab(page);
    await page.getByRole("button", { name: "Modo livre" }).click();
    await page.getByRole("button", { name: "Executar código" }).click();

    await expect(page.getByTestId("lab-stdout")).toContainText("1. Python");
    await expect(page.getByTestId("lab-stdout")).toContainText("3. HTML");
    await expect(page.getByText("Execução concluída (código 0)")).toBeVisible();
  });

  test("execução repassa entrada simulada via stdin para input()", async ({ page }) => {
    await openLab(page);

    await page.getByLabel("Código Python").fill("nome = input().strip()\nprint(f'Olá, {nome}!')");
    await page.getByLabel("Entrada simulada (stdin)").fill("Ada");
    await page.getByRole("button", { name: "Executar código" }).click();

    await expect(page.getByTestId("lab-stdout")).toHaveText("Olá, Ada!");
  });

  test("erro de execução aparece em stderr citando codigo.py", async ({ page }) => {
    await openLab(page);

    await page.getByLabel("Código Python").fill("print(10 / 0)");
    await page.getByRole("button", { name: "Executar código" }).click();

    await expect(page.getByTestId("lab-stderr")).toContainText('File "codigo.py"');
    await expect(page.getByTestId("lab-stderr")).toContainText("ZeroDivisionError");
  });

  test("testes automáticos mostram reprovação parcial e depois selo Passou nos testes automáticos", async ({
    page,
  }) => {
    await openLab(page);

    await page.getByRole("button", { name: /Rodar testes \(3\)/ }).click();
    await expect(page.getByTestId("lab-test-summary")).toContainText("0 de 3 testes passaram");

    await page.getByLabel("Código Python").fill(
      'n = int(input())\nfor numero in range(n, 0, -1):\n    print(numero)\nprint("Fogo!")',
    );
    await page.getByRole("button", { name: /Rodar testes \(3\)/ }).click();

    await expect(page.getByTestId("lab-test-summary")).toContainText("Passou nos testes automáticos");
    await expect(page.getByLabel("Passou nos testes automáticos")).toBeVisible();
  });

  test("botão Cancelar interrompe loop infinito e permite executar código logo depois", async ({ page }) => {
    await openLab(page);

    const codeEditor = page.getByLabel("Código Python");
    await codeEditor.fill("import time\nwhile True:\n    time.sleep(0.05)");
    await page.getByRole("button", { name: "Executar código" }).click();

    const cancelButton = page.getByRole("button", { name: "Cancelar" });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    await expect(page.getByRole("status").filter({ hasText: "Execução cancelada." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Executar código" })).toBeEnabled();

    await codeEditor.fill("print('recuperado')");
    await page.getByRole("button", { name: "Executar código" }).click();
    await expect(page.getByTestId("lab-stdout")).toHaveText("recuperado");
  });
});
