import { expect, test, type Page } from "@playwright/test";

const demoPassword = "LibrasLive#2026";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(demoPassword);
  await page.getByRole("button", { name: "Entrar com segurança" }).click();
}

test("home carrega a experiência pública", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Apoio inclusivo em sala de aula com Libras ao vivo" })).toBeVisible();
});

test("admin autentica e acessa o painel", async ({ page }) => {
  await signIn(page, "admin@libraslive.local");
  await expect(page).toHaveURL(/\/admin(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "Administração de sinais" })).toBeVisible();
});

test("professor autentica e acessa a sala", async ({ page }) => {
  await signIn(page, "professor.demo@libraslive.local");
  await expect(page).toHaveURL(/\/teacher(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "Professor" })).toBeVisible();
});

test("curador autentica e acessa adicionar palavras", async ({ page }) => {
  await signIn(page, "curador.demo@libraslive.local");
  await page.goto("/admin/add-words");
  await expect(page.getByRole("heading", { name: "Adicionar novas palavras" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Entrar/i })).toHaveCount(0);
});

test("entrada do aluno carrega", async ({ page }) => {
  await page.goto("/aluno");
  await expect(page.getByText(/Código da aula/i).first()).toBeVisible();
});
