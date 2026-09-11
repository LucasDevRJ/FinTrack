import { expect, test } from "@playwright/test";
import { uniqueUser } from "../helpers/testUser.js";

// Auth is the one area we walk through the real form UI end to end — every
// other spec logs in via the API helper for speed and exercises this flow
// only indirectly.

// Registering via the raw API (rather than the helper in testUser.js) so
// these tests can get at devVerificationToken directly — the backend only
// includes it outside of NODE_ENV=production, since there's no real inbox
// for a Playwright run to check (see auth.service.js's registerUser).
async function registerViaApi(request, user) {
  const response = await request.post("http://localhost:3333/api/auth/register", { data: user });
  expect(response.ok()).toBeTruthy();
  const { devVerificationToken } = await response.json();
  return devVerificationToken;
}

test.describe("Autenticação", () => {
  test("um novo usuário se cadastra e é instruído a confirmar o e-mail", async ({ page }) => {
    const user = uniqueUser("register");

    await page.goto("/register");
    await page.getByLabel("Nome").fill(user.name);
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha").fill(user.password);
    await page.getByRole("button", { name: "Criar conta" }).click();

    // Login is blocked until the e-mail is confirmed (issue #41), so
    // registering no longer auto-logs-in or navigates to /dashboard.
    await expect(page.getByRole("heading", { name: "Confirme seu e-mail" })).toBeVisible();
    await expect(page.getByText(user.email)).toBeVisible();
    await expect(page).toHaveURL("/register");
  });

  test("abrir o link de confirmação loga automaticamente e leva ao dashboard", async ({
    page,
    request,
  }) => {
    const user = uniqueUser("verify");
    const devVerificationToken = await registerViaApi(request, user);

    await page.goto(`/verify-email?token=${devVerificationToken}`);

    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByRole("heading", { name: `Olá, ${user.name}` })).toBeVisible();
  });

  test("login antes de confirmar o e-mail mostra um aviso específico", async ({ page, request }) => {
    const user = uniqueUser("unverified");
    await registerViaApi(request, user);

    await page.goto("/login");
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha").fill(user.password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(page.getByText(/confirme seu e-mail/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Reenviar e-mail de confirmação" })).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("login com credenciais válidas leva ao dashboard", async ({ page, request }) => {
    const user = uniqueUser("login");
    const devVerificationToken = await registerViaApi(request, user);
    const verifyResponse = await request.post("http://localhost:3333/api/auth/verify-email", {
      data: { token: devVerificationToken },
    });
    expect(verifyResponse.ok()).toBeTruthy();

    await page.goto("/login");
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha").fill(user.password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(page).toHaveURL("/dashboard");
  });

  test("login com senha errada mostra uma mensagem de erro específica", async ({ page, request }) => {
    const user = uniqueUser("badlogin");
    const devVerificationToken = await registerViaApi(request, user);
    await request.post("http://localhost:3333/api/auth/verify-email", {
      data: { token: devVerificationToken },
    });

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
    const devVerificationToken = await registerViaApi(request, user);
    await request.post("http://localhost:3333/api/auth/verify-email", {
      data: { token: devVerificationToken },
    });

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
