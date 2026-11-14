import { expect, test, type Page } from "@playwright/test";
import { createDatabase } from "../../src/lib/db/client";
import { attempts, lessonProgress, submissions } from "../../src/lib/db/schema";
import { assertSandboxAvailable, readSandboxSkipDirective } from "../sandbox-policy";

const sandboxPolicy = readSandboxSkipDirective("tests/e2e/pilots.spec.ts");

test.beforeEach(async () => {
  const url = process.env.E2E_DATABASE_URL;
  if (!url || !/^file:\.\/\.cache\/e2e-[a-z0-9-]+\.db$/.test(url)) {
    throw new Error("Banco não é exclusivo de E2E.");
  }
  const { db, client } = createDatabase(url);
  try {
    await db.delete(submissions);
    await db.delete(attempts);
    await db.delete(lessonProgress);
  } finally {
    client.close();
  }
});

async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, viewportWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);
}

async function fillStructuredCircularTrace(page: Page, wrong = false) {
  const rows: Array<{
    step: string;
    inicio: number;
    fim: number;
    tamanho: number;
    removido: string;
  }> = [
    { step: '1. inserir("A")', inicio: 0, fim: 1, tamanho: 1, removido: "nenhum" },
    { step: '2. inserir("B")', inicio: 0, fim: 2, tamanho: 2, removido: "nenhum" },
    { step: '3. inserir("C")', inicio: 0, fim: 3, tamanho: 3, removido: "nenhum" },
    { step: "4. remover()", inicio: 1, fim: wrong ? 2 : 3, tamanho: 2, removido: "a" },
    { step: "5. remover()", inicio: 2, fim: 3, tamanho: 1, removido: "b" },
  ];

  for (const row of rows) {
    await page.getByLabel(`${row.step} — inicio`).fill(String(row.inicio));
    await page.getByLabel(`${row.step} — fim`).fill(String(row.fim));
    await page.getByLabel(`${row.step} — tamanho`).fill(String(row.tamanho));
    await page.getByLabel(`${row.step} — Item removido`).selectOption(row.removido);
  }
  await page.getByLabel("Próximo a sair").selectOption(wrong ? "a" : "c");
}

test("Fila Circular v2: leitura, prática direta C1 sem alterar progresso, dica sequencial, tabela estruturada e histórico v1", async ({
  page,
  request,
}, testInfo) => {
  if (testInfo.project.name === "mobile") {
    await page.setViewportSize({ width: 360, height: 800 });
  }

  await page.goto("/aulas/estruturas-de-dados.pilhas-e-filas");
  await expect(page.getByRole("heading", { level: 1, name: "Pilhas e filas" })).toBeVisible();
  await expect(page.getByText("Versão 2 · Em revisão")).toBeVisible();
  await expect(page.locator("#camadas")).toContainText("rpos");
  await expect(page.locator("#camadas")).toContainText("spos");
  await expect(page.locator("#camadas")).toContainText("qtd");
  await expect(page.locator("#camadas")).toContainText("Explicação complementar");
  await expect(page.locator("#camadas")).toContainText("deque");
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: /Praticar C1: Rastrear uma fila circular/ }).click();
  await expect(page).toHaveURL(/\/estudar\/estruturas-de-dados\.pilhas-e-filas\?version=2&mode=practice&exercise=ed\.pf\.v2\.c1/);
  await expectNoHorizontalOverflow(page);

  const beforeRes = await request.get("/api/lessons/estruturas-de-dados.pilhas-e-filas?version=2");
  expect(beforeRes.status()).toBe(200);
  const beforeData = (await beforeRes.json()).data;
  expect(beforeData.progress.completedSteps).toEqual([]);
  expect(beforeData.progress.completedAt).toBeNull();
  expect(beforeData.exercises.find((e: { id: string }) => e.id === "ed.pf.v2.c1").status).toBe("PENDING");

  await expect(page.locator(".practice-preview")).toBeVisible();
  await expect(page.getByRole("button", { name: /Rastrear uma fila circular.*bloqueado/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Investigar uma remoção que falha.*bloqueado/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Escolher política de sobrecarga.*bloqueado/ })).toBeDisabled();

  await page.getByRole("button", { name: "Iniciar prática" }).click();
  await expect(page.getByText("Dicas (0 de 3 usadas)")).toBeVisible();

  await page.getByRole("button", { name: "Revelar dica 1" }).click();
  await expect(page.getByText("Dicas (1 de 3 usadas)")).toBeVisible();
  await expect(page.locator(".hints-list li")).toHaveCount(1);

  await fillStructuredCircularTrace(page, true);
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Conferir resposta" }).click();
  const retryFeedback = page.locator(".exercise-feedback.retry");
  await expect(retryFeedback).toBeVisible();
  await expect(retryFeedback).toContainText("fim");
  await expect(retryFeedback).not.toContainText("saem A e B");

  await fillStructuredCircularTrace(page, false);
  await page.getByRole("button", { name: "Conferir resposta" }).click();
  await expect(page.locator(".exercise-feedback.correct")).toBeVisible();
  await expect(page.locator(".solution-panel")).toBeVisible();
  await expect(page.getByText("Resolvido no primeiro envio e sem dicas")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.reload();
  await expect(page.locator(".solution-panel")).toBeVisible();
  await expect(page.getByText("Dicas (1 de 3 usadas)")).toBeVisible();

  await page.locator(".version-switcher").getByRole("link", { name: "Versão 1" }).click();
  await expect(page).toHaveURL(/\/estudar\/estruturas-de-dados\.pilhas-e-filas\?version=1/);
  await expect(page.getByText(/VERSÃO 1/)).toBeVisible();

  await page.locator(".version-switcher").getByRole("link", { name: "Versão 2" }).click();
  await expect(page).toHaveURL(/\/estudar\/estruturas-de-dados\.pilhas-e-filas\?version=2/);
  await page.getByRole("link", { name: "Prefere ler primeiro? Abrir aula completa (v2)." }).click();
  await expect(page).toHaveURL(/\/aulas\/estruturas-de-dados\.pilhas-e-filas\?version=2/);
});

test("Requisitos Testáveis v2: libera C2/C3 após percurso guiado, separa entrega aberta e persiste autoavaliação por rubrica", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "mobile") {
    await page.setViewportSize({ width: 360, height: 800 });
  }

  await page.goto("/estudar/requisitos.funcionais-e-nao-funcionais?version=2");
  await expect(page.getByRole("heading", { level: 1, name: "Requisitos funcionais, não funcionais e qualidade SRS" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  for (let i = 0; i < 10; i++) {
    await expect(page.locator(".reader-topline .eyebrow")).toContainText(`PARTE ${i + 1} DE 10`);
    const cards = page.locator("article.lesson-reader .question-card");
    const count = await cards.count();
    for (let c = 0; c < count; c++) {
      const card = cards.nth(c);
      await card.locator("textarea").fill(`Reflexão guiada detalhada etapa ${i + 1} pergunta ${c + 1}.`);
      await card.getByRole("button", { name: "Salvar resposta" }).click();
      await expect(card.getByRole("button", { name: "Resposta salva" })).toBeVisible();
    }
    const nextButton = page.getByRole("button", { name: /Concluir (parte e continuar|aula e praticar)/ });
    await nextButton.click();
  }
  await expect(page.locator(".practice-intro")).toBeVisible();

  const c2Btn = page.getByRole("button", { name: /Descobrir o que torna a espera aceitável/ });
  const c3Btn = page.getByRole("button", { name: /Negociar requisitos incompatíveis/ });
  await expect(c2Btn).toBeEnabled();
  await expect(c3Btn).toBeEnabled();

  await c2Btn.click();
  await page.getByLabel("Perguntas de descoberta e interlocutores").fill(
    "Confirmar com coordenação e alunos qual evento conclui o download e qual navegador predomina no campus.",
  );
  await page.getByLabel("Critério provisório e hipóteses adotadas").fill(
    "Medir do clique até arquivo liberado em ambiente de homologação com 50 sessões simultâneas, meta inicial 3s.",
  );
  await page.getByLabel("Testes: aprovação, fronteira de reprovação e sessão expirada").fill(
    "Aprovado até 3000ms em 95 de 100 requisições; reprovado em 3001ms; sessão expirada redireciona para login sem vazar PDF.",
  );
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Enviar para autoavaliação" }).click();
  await expect(page.locator(".practice-status-row")).toContainText("0 de 8 exercícios resolvidos");
  await expect(page.locator(".practice-status-row")).toContainText("1 enviada para autoavaliação");
  await expect(page.locator(".solution-panel")).toContainText("Enviado para autoavaliação");
  await expect(page.locator(".rubric-box")).toBeVisible();

  await page.getByRole("checkbox", { name: /Fatos vs\. hipóteses/ }).check();
  await page.getByRole("checkbox", { name: /Critério provisório mensurável/ }).check();
  await page.getByRole("button", { name: "Registrar autoavaliação" }).click();
  await expect(page.getByText("Autoavaliação registrada (2 de 5 critérios marcados).")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/estudar/requisitos.funcionais-e-nao-funcionais?version=2&mode=practice&exercise=req.fnf.v2.c2");
  await expect(page.getByText("Autoavaliação registrada (2 de 5 critérios marcados).")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Fatos vs\. hipóteses/ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /Critério provisório mensurável/ })).toBeChecked();

  await page.getByRole("checkbox", { name: /Sessão expirada/ }).check();
  await page.getByRole("button", { name: "Atualizar autoavaliação" }).click();
  await expect(page.getByText("Autoavaliação registrada (3 de 5 critérios marcados).")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test.describe("Laboratório Python Fila Circular C2", () => {
  test.beforeAll(async () => {
    await assertSandboxAvailable("tests/e2e/pilots.spec.ts");
  });

  test.beforeEach(() => {
    test.skip(sandboxPolicy.shouldSkip, sandboxPolicy.warning ?? "SANDBOX_TESTS=skip");
  });

  test("código inicial falha, correção passa nos 4 testes e resultados ficam só no navegador", async ({
    page,
    request,
  }, testInfo) => {
    if (testInfo.project.name === "mobile") {
      await page.setViewportSize({ width: 360, height: 800 });
    }

    await page.goto("/laboratorio/estruturas-de-dados.pilhas-e-filas");
    await expect(page.getByRole("heading", { level: 1, name: "Laboratório Python — Fila Circular (C2)" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: /Rodar testes \(4\)/ }).click();
    const summary = page.getByTestId("lab-test-summary");
    await expect(summary).toContainText("testes passaram");
    await expect(summary).not.toContainText("Passou nos testes automáticos");

    const codeEditor = page.getByLabel("Código Python");
    const starter = await codeEditor.inputValue();
    expect(starter).toContain("if inicio == fim:");
    await codeEditor.fill(starter.replace("if inicio == fim:", "if tamanho == 0:"));

    await page.getByRole("button", { name: /Rodar testes \(4\)/ }).click();
    await expect(summary).toContainText("Passou nos testes automáticos");
    await expectNoHorizontalOverflow(page);

    const lessonRes = await request.get("/api/lessons/estruturas-de-dados.pilhas-e-filas?version=2");
    expect(lessonRes.status()).toBe(200);
    const lessonData = (await lessonRes.json()).data;
    expect(lessonData.exercises.find((e: { id: string }) => e.id === "ed.pf.v2.c2").status).toBe("PENDING");
  });
});
