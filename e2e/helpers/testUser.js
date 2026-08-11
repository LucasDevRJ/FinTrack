const API_URL = "http://localhost:3333/api";

/**
 * Generates a unique-per-run user so tests never collide with each other
 * or with real dev data sitting in the local database.
 */
export function uniqueUser(prefix = "e2e") {
  const stamp = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  return {
    name: "E2E Test User",
    email: `${prefix}_${stamp}@fintrack-e2e.test`,
    password: "SenhaForte123",
  };
}

/**
 * Registers a fresh user directly against the API (not through the UI) and
 * returns the token. Used by specs that aren't testing the auth flow
 * itself, so each test doesn't have to re-walk the register form just to
 * get to a logged-in state — the auth flow itself is covered separately in
 * auth.spec.js.
 */
export async function registerUserViaApi(request, user = uniqueUser()) {
  const response = await request.post(`${API_URL}/auth/register`, {
    data: user,
  });
  if (!response.ok()) {
    throw new Error(`Falha ao registrar usuário de teste: ${response.status()} ${await response.text()}`);
  }
  const { token } = await response.json();
  return { user, token };
}

/**
 * Logs a Playwright `page` in as the given user by seeding localStorage
 * with a token obtained via the API, then loading the app so AuthContext
 * picks it up. Faster than typing into the login form on every spec, while
 * still exercising the real token/me-request bootstrap path.
 */
export async function loginAsUser(page, request, user) {
  const { token } = await registerUserViaApi(request, user);
  await page.addInitScript((t) => {
    window.localStorage.setItem("fintrack_token", t);
  }, token);
  await page.goto("/dashboard");
  await page.waitForURL("/dashboard");
  return token;
}