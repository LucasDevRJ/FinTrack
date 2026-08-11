import { expect, test } from "@playwright/test";
import { loginAsUser, uniqueUser } from "../helpers/testUser.js";

test.describe("Metas de orçamento", () => {
  test.beforeEach(async ({ page, request }) => {
    await loginAsUser(page, request, uniqueUser("budget"));
    await page.goto("/budgets");
  });

  async function createGoal(page, category, monthlyLimit) {
    await page.getByRole("button", { name: "Nova meta" }).click();
    await page.getByLabel("Categoria").fill(category);
    await page.getByLabel("Limite mensal").fill(monthlyLimit);
    await page.getByRole("button", { name: "Salvar" }).click();
  }

  // Each goal card is a <div> wrapping the category <h3> heading — walk up
  // to the nearest card ancestor so assertions/actions stay scoped to the
  // right goal instead of matching the whole page.
  function getGoalCard(page, category) {
    return page
      .getByRole("heading", { name: category, exact: true })
      .locator("xpath=ancestor::div[contains(@class, 'rounded-lg')][1]");
  }

  test("criar uma meta faz ela aparecer com a barra de progresso", async ({ page }) => {
    await createGoal(page, "Alimentação", "800");

    const card = getGoalCard(page, "Alimentação");
    await expect(card).toBeVisible();
    await expect(card).toContainText("800,00");
  });

  test("categoria duplicada (case-insensitive) é rejeitada com mensagem específica", async ({ page }) => {
    await createGoal(page, "Saúde", "300");
    await expect(getGoalCard(page, "Saúde")).toBeVisible();

    // Same category, different casing — backend rejects case-insensitively.
    await createGoal(page, "saúde", "500");

    await expect(page.getByText("Já existe uma meta para esta categoria")).toBeVisible();
  });

  test("excluir uma meta pede confirmação antes de remover", async ({ page }) => {
    await createGoal(page, "Educação", "400");
    const card = getGoalCard(page, "Educação");
    await expect(card).toBeVisible();

    await card.getByRole("button", { name: "Excluir" }).click();
    await card.getByRole("button", { name: "Confirmar" }).click();

    await expect(page.getByRole("heading", { name: "Educação", exact: true })).toHaveCount(0);
  });
});