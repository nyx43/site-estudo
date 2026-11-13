import { expect, test, type APIRequestContext } from "@playwright/test";
import { createDatabase } from "../../src/lib/db/client";
import { attempts, lessonProgress, submissions } from "../../src/lib/db/schema";
import { lessonSteps } from "../../src/lib/study/schema";

const topicId = "python.lacos-de-repeticao";
const lessonId = `${topicId}.v1`;

test.beforeEach(async () => {
  const url = process.env.E2E_DATABASE_URL;
  if (!url || !/^file:\.\/\.cache\/e2e-[a-z0-9-]+\.db$/.test(url)) throw new Error("Recusado: banco não é exclusivo de E2E.");
  const { db, client } = createDatabase(url);
  try { await db.delete(submissions); await db.delete(attempts); await db.delete(lessonProgress); }
  finally { client.close(); }
});

async function completeViaApi(request: APIRequestContext) {
  const { data } = await (await request.get(`/api/lessons/${topicId}`)).json();
  for (const question of [...data.lesson.prequestions, ...data.lesson.selfExplain, ...data.lesson.retrieval]) {
    const response = await request.post(`/api/lessons/${lessonId}/progress`, { data: { action: "ANSWER", questionId: question.id, answer: "Minha explicação para este conceito." } });
    expect(response.ok()).toBe(true);
  }
  for (const step of lessonSteps) {
    const response = await request.post(`/api/lessons/${lessonId}/progress`, { data: { action: "COMPLETE_STEP", step } });
    expect(response.ok()).toBe(true);
  }
}

test("aula inteira, retomada, múltiplos envios e consulta da solução", async ({ page, request }) => {
  const initial = await (await request.get(`/api/lessons/${topicId}`)).text();
  expect(initial).not.toContain("modelAnswer");
  await page.goto(`/estudar/${topicId}`);
  await expect(page.getByRole("heading", { name: "O que você já imagina?" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await expect(page.getByRole("button", { name: /Concluir parte e continuar/ })).toBeDisabled();
  for (let index = 0; index < 2; index++) {
    const card = page.locator(".question-card").nth(index);
    await card.getByRole("textbox").fill("Meu palpite inicial sobre a repetição.");
    await card.getByRole("button", { name: "Salvar resposta" }).click();
    await expect(card.getByRole("button", { name: "Resposta salva" })).toBeVisible();
  }
  await page.getByRole("button", { name: "Concluir parte e continuar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Por que repetir instruções?" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Por que repetir instruções?" })).toBeVisible();
  for (let part = 2; part <= 9; part++) {
    await expect(page.locator(".reader-topline .eyebrow")).toHaveText(`PARTE ${part} DE 10`);
    await page.getByRole("button", { name: "Concluir parte e continuar", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Explique antes de conferir" })).toBeVisible();
  for (let index = 0; index < 4; index++) {
    const card = page.locator(".question-card").nth(index);
    await card.getByRole("textbox").fill("A condição e a atualização determinam as voltas; o total guarda o resultado anterior.");
    await card.getByRole("button", { name: "Salvar resposta" }).click();
    await expect(card.getByText("Uma resposta possível")).toBeVisible();
  }
  await page.getByRole("button", { name: "Concluir aula e praticar" }).click();
  await expect(page.getByRole("heading", { name: "Transforme a ideia em raciocínio." })).toBeVisible();
  await page.getByRole("button", { name: /Exercício 1: Onde o intervalo termina/ }).click();
  await page.getByRole("radio").nth(0).check();
  await page.getByRole("button", { name: "Conferir resposta" }).click();
  await expect(page.locator(".exercise-feedback.retry")).toBeVisible();
  await expect(page.locator(".solution-panel")).toHaveCount(0);
  await page.getByRole("radio").nth(1).check();
  await page.getByRole("button", { name: "Conferir resposta" }).click();
  await expect(page.getByRole("heading", { name: "Raciocínio confirmado" })).toBeVisible();
  await expect(page.getByText("1 de 12 exercícios resolvidos", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("1 de 12 exercícios resolvidos", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Exercício 1: Onde o intervalo termina/ }).click();
  await expect(page.getByText("2 envios", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Exercício 2: Pode não haver/ }).click();
  await page.getByRole("button", { name: "Ver solução e encerrar tentativa" }).click();
  await expect(page.getByRole("heading", { name: "Solução consultada" })).toBeVisible();
  await expect(page.getByText("1 de 12 exercícios resolvidos", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("Parsons, identificação de erros e previsão de saída pela interface", async ({ page, request }) => {
  await completeViaApi(request);
  await page.goto(`/estudar/${topicId}`);
  await page.getByRole("button", { name: /Exercício 5: Monte a soma/ }).click();
  for (const code of ["total = 0", "for n in [2, 4, 6]:", "total += n", "print(total)"]) {
    await page.getByRole("button", { name: `Adicionar bloco: ${code}`, exact: true }).click();
  }
  await page.getByRole("combobox", { name: "Recuo da linha 3" }).selectOption("1");
  await page.getByRole("button", { name: "Conferir resposta" }).click();
  await expect(page.getByRole("heading", { name: "Raciocínio confirmado" })).toBeVisible();
  await page.getByRole("button", { name: /Exercício 8: Revise o intervalo/ }).click();
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(2).check();
  await page.getByRole("button", { name: "Conferir resposta" }).click();
  await expect(page.getByRole("heading", { name: "Raciocínio confirmado" })).toBeVisible();
  await page.getByRole("button", { name: /Exercício 12: Rastreie a condição/ }).click();
  await page.getByRole("textbox", { name: "Sua previsão de saída" }).fill("2\n1");
  await page.getByRole("button", { name: "Conferir resposta" }).click();
  await expect(page.getByRole("heading", { name: "Raciocínio confirmado" })).toBeVisible();
  await expect(page.getByText("3 de 12 exercícios resolvidos", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("uma resposta perdida na rede pode ser reenviada sem duplicar a tentativa", async ({ page, request }) => {
  await completeViaApi(request);
  await page.goto(`/estudar/${topicId}`);
  await page.getByRole("button", { name: /Exercício 1: Onde o intervalo termina/ }).click();
  await page.getByRole("radio").nth(1).check();
  await page.route("**/api/attempts/*/submissions", async (route) => {
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    await route.abort("failed");
  }, { times: 1 });
  await page.getByRole("button", { name: "Conferir resposta" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Conferir resposta" }).click();
  await expect(page.getByRole("heading", { name: "Raciocínio confirmado" })).toBeVisible();
  await expect(page.getByText("1 envio", { exact: true })).toBeVisible();
});
