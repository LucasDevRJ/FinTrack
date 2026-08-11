import { expect, test } from "@playwright/test";
import { loginAsUser, uniqueUser } from "../helpers/testUser.js";

test.describe("Transações", () => {
  test.beforeEach(async ({ page, request }) => {
    await loginAsUser(page, request, uniqueUser("tx"));
    await page.goto("/transactions");
  });

  test("criar uma despesa faz ela aparecer na tabela", async ({ page }) => {
    await page.getByRole("button", { name: "Nova transação" }).click();

    await page.getByLabel("Tipo").selectOption("EXPENSE");
    await page.getByLabel("Valor").fill("125.50");
    await page.locator("#category").fill("Mercado");
    await page.getByLabel("Data").fill("2026-08-05");
    await page.getByLabel("Descrição (opcional)").fill("Compras do mês");
    await page.getByRole("button", { name: "Salvar" }).click();

    const row = page.getByRole("row", { name: /Mercado/ });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Compras do mês");
    await expect(row).toContainText("R$"); // formatCurrency output
    await expect(row).toContainText("125,50");
  });

  test("criar uma receita e editá-la depois reflete o novo valor", async ({ page }) => {
    await page.getByRole("button", { name: "Nova transação" }).click();
    await page.getByLabel("Tipo").selectOption("INCOME");
    await page.getByLabel("Valor").fill("2000");
    await page.locator("#category").fill("Salário");
    await page.getByLabel("Data").fill("2026-08-01");
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByRole("row", { name: /Salário/ })).toBeVisible();

    await page.getByRole("row", { name: /Salário/ }).getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Valor").fill("2500");
    await page.getByRole("button", { name: "Salvar" }).click();

    const row = page.getByRole("row", { name: /Salário/ });
    await expect(row).toContainText("2.500,00");
  });

  test("excluir uma transação pede confirmação antes de remover", async ({ page }) => {
    await page.getByRole("button", { name: "Nova transação" }).click();
    await page.getByLabel("Tipo").selectOption("EXPENSE");
    await page.getByLabel("Valor").fill("40");
    await page.locator("#category").fill("Transporte");
    await page.getByLabel("Data").fill("2026-08-03");
    await page.getByRole("button", { name: "Salvar" }).click();

    const row = page.getByRole("row", { name: /Transporte/ });
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Excluir" }).click();
    // Clicking "Excluir" only arms the confirmation — the row must still be
    // there until "Confirmar" is clicked.
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Confirmar" }).click();

    await expect(page.getByRole("row", { name: /Transporte/ })).toHaveCount(0);
  });

  test("busca por texto filtra a lista de transações", async ({ page }) => {
    await page.getByRole("button", { name: "Nova transação" }).click();
    await page.getByLabel("Tipo").selectOption("EXPENSE");
    await page.getByLabel("Valor").fill("15");
    await page.locator("#category").fill("Lazer");
    await page.getByLabel("Data").fill("2026-08-02");
    await page.getByLabel("Descrição (opcional)").fill("Cinema com amigos");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("row", { name: /Lazer/ })).toBeVisible();

    await page.getByLabel("Buscar").fill("cinema");
    await page.getByRole("button", { name: "Filtrar" }).click();

    await expect(page.getByRole("row", { name: /Lazer/ })).toBeVisible();

    await page.getByLabel("Buscar").fill("categoria-que-nao-existe");
    await page.getByRole("button", { name: "Filtrar" }).click();

    await expect(page.getByText("Nenhuma transação encontrada para os filtros selecionados.")).toBeVisible();
  });
});