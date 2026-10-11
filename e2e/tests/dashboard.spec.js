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

  // 360px is the most common Android width in Brazil; at 390px the labels
  // fitted but at 360px they already touched each other.
  test.describe("no celular", () => {
    test.use({ viewport: { width: 360, height: 800 } });

    test("o gráfico de 6 meses mostra o nome de todos os meses", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(monthAxisLabels(page)).toHaveCount(6);
    });

    // Counting labels can't see them colliding: interval={0} forces every
    // label to render even when there's no room for it.
    test("os nomes dos meses não se sobrepõem", async ({ page }) => {
      await page.goto("/dashboard");
      const labels = monthAxisLabels(page);
      await expect(labels).toHaveCount(6);

      const boxes = await labels.evaluateAll((nodes) =>
        nodes.map((node) => {
          const { left, right } = node.getBoundingClientRect();
          return { text: node.textContent, left, right };
        })
      );
      const overlapping = boxes
        .slice(1)
        .filter((box, i) => box.left < boxes[i].right)
        .map((box, i) => `${boxes[i].text} × ${box.text}`);

      expect(overlapping).toEqual([]);
    });
  });
});
