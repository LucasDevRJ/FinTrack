import { expect, test } from "@playwright/test";
import { uniqueUser } from "../helpers/testUser.js";

// Auth is the one area we walk through the real form UI end to end — every
// other spec logs in via the API helper for speed and exercises this flow
// only indirectly.

test.describe("Autenticação", () => {
  test("um novo usuário consegue se cadastrar e cair no dashboard", async ({ page }) => {
    const user = uniqueUser("register");

    await page.goto("/register");
    await page.getByLabel("Nome").fill(user.name);
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha").fill(user.password);
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByRole("heading", { name: `Olá, ${user.name}` })).toBeVisible();
  });

  test("login com credenciais válidas leva ao dashboard", async ({ page, request }) => {
    const user = uniqueUser("login");
    const response = await request.post("http://localhost:3333/api/auth/register", { data: user });
    expect(response.ok()).toBeTruthy();

    await page.goto("/login");
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha").fill(user.password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(page).toHaveURL("/dashboard");
  });

  test("login com senha errada mostra uma mensagem de erro específica", async ({ page, request }) => {
    const user = uniqueUser("badlogin");
    await request.post("http://localhost:3333/api/auth/register", { data: user });

    await page.goto("/login");
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha").fill("senhaErrada123");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(page.getByText(/e-mail ou senha/i)).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("acessar uma rota protegida sem estar logado redireciona para /login", async ({ page }) => {
    await page.goto("/transactions");
    await expect(page).toHaveURL("/login");
  });

  test("logout limpa a sessão e bloqueia rotas protegidas de novo", async ({ page, request }) => {
    const user = uniqueUser("logout");
    await request.post("http://localhost:3333/api/auth/register", { data: user });

    await page.goto("/login");
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha").fill(user.password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL("/dashboard");

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL("/login");

    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login");
  });
});
