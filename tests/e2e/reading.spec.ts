import { expect, test } from "@playwright/test";

test("aulas completas mostram código explicado sem exigir respostas", async ({ page, request }, testInfo) => {
  if (testInfo.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/aulas");
  await expect(page.locator(".lesson-library-card")).toHaveCount(3);
  await expect(page.locator(".lesson-library-card").first()).toContainText("Variáveis e tipos");
  await page.locator(".lesson-library-card").first().getByRole("link", { name: "Ler aula completa", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Variáveis e tipos", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comandos e sintaxe, sem pular etapas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "O que cada linha faz", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Como revisar uma solução de IA", exact: true })).toBeVisible();
  await expect(page.locator(".code-example").first()).toContainText("quantidade = 3");
  await expect(page.getByRole("textbox")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect((await (await request.get("/api/lessons/python.variaveis-e-tipos")).json()).data.progress.completedAt).toBeNull();
  expect((await (await request.get("/api/lessons/python.variaveis-e-tipos")).json()).data.progress.completedSteps).toEqual([]);
  await expect(page.locator(".source-list a").first()).toHaveAttribute("href", /^https:\/\/docs\.python\.org\//);
  await page.getByRole("link", { name: /Estudo guiado e 6 exercícios/ }).click();
  await expect(page.getByRole("heading", { name: "O que você já imagina?" })).toBeVisible();
});

test("conteúdo antigo e seu progresso continuam acessíveis por versão", async ({ page, request }) => {
  const path = "/api/lessons/python.lacos-de-repeticao.v1/progress";
  await request.post(path, { data: { action: "ANSWER", questionId: "pre-range", answer: "Meu palpite da versão anterior." } });
  await page.goto("/estudar/python.lacos-de-repeticao");
  await expect(page.getByRole("link", { name: "Retomar versão 1", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Retomar versão 1", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /Sem executar: quais números/ })).toHaveValue("Meu palpite da versão anterior.");
  const old = await request.get("/api/lessons/python.lacos-de-repeticao?version=1");
  expect((await old.json()).data.lesson.version).toBe(1);
  expect((await (await request.get("/api/lessons/python.lacos-de-repeticao")).json()).data.lesson.version).toBe(2);
});
