import { expect, test } from "@playwright/test";
import { loginAsUser, uniqueUser } from "../helpers/testUser.js";

const API_URL = "http://localhost:3333/api";

// Day 1 of the current month, in UTC like the backend's due-date math (#87):
// with dayOfMonth 1 it is always already due, so exactly one pending bill.
function firstOfCurrentMonth() {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}-${month}-01`;
}

async function createVariableBillViaApi(request, token, category) {
  const res = await request.post(`${API_URL}/recurring`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      type: "EXPENSE",
      variableAmount: true,
      category,
      dayOfMonth: 1,
      startDate: firstOfCurrentMonth(),
    },
  });
  expect(res.ok()).toBe(true);
}

function pendingBill(page, category) {
  return page.getByRole("region", { name: new RegExp(`^${category} — vencimento`) });
}

test.describe("Recorrências", () => {
  let token;

  test.beforeEach(async ({ page, request }) => {
    token = await loginAsUser(page, request, uniqueUser("rec"));
    await page.goto("/recurring");
  });

  test("recorrência de valor fixo continua mostrando o valor na lista", async ({ page }) => {
    await page.getByRole("button", { name: "Nova recorrência" }).click();
    await page.getByLabel("Valor", { exact: true }).fill("1400");
    await page.getByLabel("Categoria").fill("Aluguel");
    await page.getByLabel("Dia do mês").fill("5");
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByRole("heading", { name: "Aluguel", exact: true })).toBeVisible();
    await expect(page.getByText("1.400,00")).toBeVisible();
  });

  test("conta de valor variável fica pendente até confirmar o valor e só então vira transação", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Nova recorrência" }).click();
    await page.getByLabel("Tipo de valor").selectOption("variable");
    await expect(page.getByLabel("Valor", { exact: true })).toBeHidden();
    await page.getByLabel("Categoria").fill("Luz");
    await page.getByLabel("Dia do mês").fill("1");
    await page.getByLabel("Início").fill(firstOfCurrentMonth());
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByText("Valor variável")).toBeVisible();
    const bill = pendingBill(page, "Luz");
    await expect(bill).toBeVisible();

    await bill.getByLabel("Valor da conta").fill("187.40");
    await bill.getByRole("button", { name: "Confirmar valor" }).click();
    await expect(bill).toBeHidden();

    await page.goto("/transactions");
    await expect(page.getByRole("row", { name: /Luz/ })).toContainText("187,40");
  });

  test("pular o mês pede confirmação e remove a pendência sem criar transação", async ({
    page,
    request,
  }) => {
    await createVariableBillViaApi(request, token, "Água");
    await page.reload();

    const bill = pendingBill(page, "Água");
    await bill.getByRole("button", { name: "Pular este mês" }).click();
    // The first click only arms the skip — the bill must still be there.
    await expect(bill).toBeVisible();
    await bill.getByRole("button", { name: "Confirmar pulo" }).click();
    await expect(bill).toBeHidden();

    await page.goto("/transactions");
    await expect(page.getByText("Nenhuma transação cadastrada ainda.")).toBeVisible();
  });

  test("dashboard avisa sobre contas a confirmar e leva à tela de recorrências", async ({
    page,
    request,
  }) => {
    await createVariableBillViaApi(request, token, "Gás");

    await page.goto("/dashboard");
    await expect(
      page.getByText("Você tem 1 conta de valor variável para confirmar.")
    ).toBeVisible();
    await page.getByRole("link", { name: "Confirmar valores" }).click();

    await expect(page).toHaveURL(/\/recurring$/);
    await expect(pendingBill(page, "Gás")).toBeVisible();
  });

  test("o tipo de valor não pode ser alterado ao editar", async ({ page, request }) => {
    await createVariableBillViaApi(request, token, "Internet");
    await page.reload();

    await page.getByRole("button", { name: "Editar" }).click();

    await expect(page.getByLabel("Tipo de valor")).toBeDisabled();
    await expect(page.getByLabel("Tipo de valor")).toHaveValue("variable");
  });

  test.describe("no horário de Brasília", () => {
    test.use({ timezoneId: "America/Sao_Paulo" });

    // 22:30 in Brasília is already the next day in UTC — the window where a
    // UTC-based "today" pre-fills tomorrow's date (#82).
    test("nova recorrência à noite começa hoje, não amanhã", async ({ page }) => {
      await page.clock.setFixedTime(new Date("2026-09-23T22:30:00-03:00"));

      await page.getByRole("button", { name: "Nova recorrência" }).click();

      await expect(page.getByLabel("Início")).toHaveValue("2026-09-23");
    });
  });
});
