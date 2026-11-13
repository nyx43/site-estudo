import { expect, test } from "@playwright/test";

test("tema acompanha o sistema e mantém a escolha ao navegar e recarregar", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Modo claro" })).toBeVisible();
  await expect(page.locator(".subject-card").first()).toHaveCSS("background-color", "rgb(28, 43, 34)");

  await page.getByRole("button", { name: "Modo claro" }).click();
  await expect(root).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(root).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Modo escuro" }).click();
  await page.getByRole("link", { name: "Aulas completas", exact: true }).click();
  await expect(root).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".lesson-library-card").first()).toHaveCSS("background-color", "rgb(28, 43, 34)");
  await page.reload();
  await expect(page.getByRole("button", { name: "Modo claro" })).toBeVisible();
});
