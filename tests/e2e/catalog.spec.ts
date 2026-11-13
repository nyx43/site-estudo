import { expect, test } from "@playwright/test";

test("busca, filtros, currículo e navegação em todas as telas", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Conhecimento que/ })).toBeVisible();
  await expect(page.locator(".subject-card")).toHaveCount(5);
  await page.getByRole("button", { name: "Conceituais", exact: true }).click();
  await expect(page.locator(".subject-card")).toHaveCount(1);
  await expect(page.locator(".subject-card")).toContainText("Análise de Requisitos");
  await page.getByRole("button", { name: "Todas as disciplinas" }).click();
  const search = page.getByRole("textbox", { name: "Buscar disciplinas ou tópicos" });
  await search.fill("lacos");
  await expect(page.locator(".subject-card")).toHaveCount(1);
  await expect(page.locator(".subject-card")).toContainText("Python");
  await search.fill("sem-resultado-improvavel");
  await expect(page.getByRole("heading", { name: "Nenhuma disciplina encontrada" })).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(page.locator(".subject-card")).toHaveCount(5);
  await page.locator(".subject-card").filter({ has: page.getByRole("heading", { name: "Python", exact: true }) }).click();
  await expect(page.getByRole("heading", { name: "Python", exact: true })).toBeVisible();
  await expect(page.locator(".module-card")).toHaveCount(3);
  await page.getByRole("link", { name: /Laços de repetição/ }).click();
  await expect(page.getByRole("heading", { name: "Laços de repetição", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Objetivos de aprendizagem" })).toBeVisible();
  await expect(page.getByText("4 quizzes, 3 Parsons", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Condicionais Python" }).click();
  await expect(page.getByRole("heading", { name: "Condicionais", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(errors).toEqual([]);
});

test("API pública, recurso ausente e página de evolução", async ({ request, page }) => {
  const response = await request.get("/api/subjects");
  expect(response.ok()).toBe(true);
  expect((await response.json()).data).toHaveLength(5);
  const missing = await request.get("/api/topics/ausente.topico");
  expect(missing.status()).toBe(404);
  const missingPage = await page.goto("/disciplinas/ausente");
  expect(missingPage?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Este caminho ainda não existe." })).toBeVisible();
  await page.getByRole("link", { name: "O caminho do projeto" }).click();
  await expect(page.getByRole("heading", { name: "Levar o estudo com você" })).toBeVisible();
});
