import { createDatabase } from "../../src/lib/db/client";
import { attempts, lessonProgress, submissions } from "../../src/lib/db/schema";
import { randomUUID } from "node:crypto";
import { lessonSteps } from "../../src/lib/study/schema";
import { expect, test } from "@playwright/test";

test.beforeEach(async () => {
  const url = process.env.E2E_DATABASE_URL;
  if (!url || !/^file:\.\/\.cache\/e2e-[a-z0-9-]+\.db$/.test(url)) throw new Error("Banco não é exclusivo de E2E.");
  const { db, client } = createDatabase(url);
  try { await db.delete(submissions); await db.delete(attempts); await db.delete(lessonProgress); }
  finally { client.close(); }
});

test("aulas completas mostram código explicado sem exigir respostas", async ({ page, request }, testInfo) => {
  if (testInfo.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/aulas");
  await expect(page.locator(".lesson-library-card")).toHaveCount(4);
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


test("listas e dicionários: leitura, oito exercícios e correção persistida", async ({ page, request }) => {
  const topic = "python.listas-e-dicionarios";
  await page.goto(`/aulas/${topic}`);
  await expect(page.getByRole("heading", { name: "Listas e dicionários", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Frequência não é presença", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  const { data } = await (await request.get(`/api/lessons/${topic}`)).json();
  expect(data.exercises).toHaveLength(8);
  expect(JSON.stringify(data)).not.toContain('"solution"');
  for (const question of [...data.lesson.prequestions, ...data.lesson.selfExplain, ...data.lesson.retrieval]) {
    const answer = await request.post(`/api/lessons/${data.lesson.id}/progress`, { data: { action: "ANSWER", questionId: question.id, answer: "Uma lista preserva repetições; um dicionário associa chaves únicas a valores." } });
    expect(answer.ok()).toBe(true);
  }
  for (const step of lessonSteps) {
    expect((await request.post(`/api/lessons/${data.lesson.id}/progress`, { data: { action: "COMPLETE_STEP", step } })).ok()).toBe(true);
  }
  await page.goto(`/estudar/${topic}`);
  await page.getByRole("button", { name: /Exercício 3: Referência compartilhada/ }).click();
  await page.getByRole("textbox").fill("[4]");
  await page.getByRole("button", { name: "Conferir resposta" }).click();
  await expect(page.locator(".exercise-feedback.retry")).toBeVisible();
  await page.getByRole("textbox").fill("[4, 7]");
  await page.getByRole("button", { name: "Conferir resposta" }).click();
  await expect(page.getByRole("heading", { name: "Raciocínio confirmado" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("1 de 8 exercícios resolvidos", { exact: true })).toBeVisible();
  const parsons = await (await request.post("/api/attempts", { data: { exerciseId: `${data.lesson.id}.parsons-01` } })).json();
  const result = await request.post(`/api/attempts/${parsons.data.id}/submissions`, { data: { requestId: randomUUID(), answer: { type: "PARSONS", order: [{ id: "c", indent: 0 }, { id: "a", indent: 0 }, { id: "d", indent: 1 }, { id: "b", indent: 0 }] } } });
  expect(result.ok()).toBe(true);
  expect((await result.json()).data.isCorrect).toBe(true);
});
