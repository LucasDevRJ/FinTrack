import { expect, test } from "@playwright/test";
import { loginAsUser, uniqueUser } from "../helpers/testUser.js";

const API_URL = "http://localhost:3333/api";

// Recharts draws the axis as plain SVG text with no accessible role, so the
// ticks are located by class name (accessibility debt of the chart lib),
// scoped to this card: the category chart has its own X axis too.
function monthAxisLabels(page) {
  return page
    .getByRole("heading", { name: /Receitas x despesas/ })
    .locator("xpath=..")
    .locator(".recharts-xAxis-tick-labels text");
}

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page, request }) => {
    const token = await loginAsUser(page, request, uniqueUser("dash"));
    // Any transaction in the window makes the 6-month chart render.
    const res = await request.post(`${API_URL}/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { type: "EXPENSE", amount: 150, category: "Mercado", date: new Date().toISOString() },
    });
    expect(res.ok()).toBe(true);
  });

  // Recharts' default tick interval silently drops labels it thinks would
  // overlap, leaving bars with no month name (#100).
  test("o gráfico de 6 meses mostra o nome de todos os meses", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(monthAxisLabels(page)).toHaveCount(6);
  });

  test.describe("no celular", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("o gráfico de 6 meses mostra o nome de todos os meses", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(monthAxisLabels(page)).toHaveCount(6);
    });
  });
});
