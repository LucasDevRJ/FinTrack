import { expect, test } from "@playwright/test";
import { loginAsUser, uniqueUser } from "../helpers/testUser.js";

test.describe("Recorrências", () => {
  test.use({ timezoneId: "America/Sao_Paulo" });

  test.beforeEach(async ({ page, request }) => {
    await loginAsUser(page, request, uniqueUser("rec"));
    await page.goto("/recurring");
  });

  // Same UTC "today" window as the transaction form test in
  // transactions.spec.js (#82).
  test("nova recorrência à noite começa hoje, não amanhã", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-09-23T22:30:00-03:00"));

    await page.getByRole("button", { name: "Nova recorrência" }).click();

    await expect(page.getByLabel("Início")).toHaveValue("2026-09-23");
  });
});
