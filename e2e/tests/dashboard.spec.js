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

// Pairs of neighbouring labels whose boxes intersect. Counting labels can't
// see this: interval={0} forces every label to render even with no room.
async function overlappingLabels(labels) {
  const boxes = await labels.evaluateAll((nodes) =>
    nodes.map((node) => {
      const { left, right } = node.getBoundingClientRect();
      return { text: node.textContent, left, right };
    })
  );
  return boxes
    .slice(1)
    .map((box, i) => ({ previous: boxes[i], box }))
    .filter(({ previous, box }) => box.left < previous.right)
    .map(({ previous, box }) => `${previous.text} × ${box.text}`);
}

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page, request }) => {
    const token = await loginAsUser(page, request, uniqueUser("dash"));
    // Any transaction in the window makes the 6-month chart render. UTC "now"
    // is right here: the backend builds the window from the same UTC clock.
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

  // 360px is the most common Android width in Brazil; at 390px the labels
  // fitted but at 360px they already touched each other.
  test.describe("no celular", () => {
    test.use({ viewport: { width: 360, height: 800 } });

    // React's dev StrictMode fetches the summary twice, so a route.fetch can
    // still be in flight when a test ends ("route.fetch: Test ended"). In
    // afterEach it also runs when an assertion fails.
    test.afterEach(async ({ page }) => {
      await page.unrouteAll({ behavior: "ignoreErrors" });
    });

    test("o gráfico de 6 meses mostra o nome de todos os meses", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(monthAxisLabels(page)).toHaveCount(6);
    });

    test("os nomes dos meses não se sobrepõem", async ({ page }) => {
      await page.goto("/dashboard");
      const labels = monthAxisLabels(page);
      await expect(labels).toHaveCount(6);

      expect(await overlappingLabels(labels)).toEqual([]);
    });

    // The window comes from the server clock, so the worst case (December
    // first, then January: two labels carrying a year side by side) is forced
    // here instead of only being exercised when the suite runs in May.
    test("os nomes dos meses não se sobrepõem na virada do ano", async ({ page }) => {
      const months = ["2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05"];
      await page.route("**/api/transactions/summary", async (route) => {
        const response = await route.fetch();
        const summary = await response.json();
        summary.monthlyBreakdown = summary.monthlyBreakdown.map((entry, i) => ({
          ...entry,
          month: months[i],
        }));
        await route.fulfill({ response, json: summary });
      });

      await page.goto("/dashboard");
      const labels = monthAxisLabels(page);
      await expect(labels).toHaveCount(6);

      expect(await overlappingLabels(labels)).toEqual([]);
    });
  });
});
