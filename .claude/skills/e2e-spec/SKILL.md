---
name: e2e-spec
description: 'Escreve ou estende testes E2E Playwright do FinTrack (pasta e2e/) seguindo a estratégia de dados e os helpers do repo — usuário único por teste, login via API, locators acessíveis, nomes em português. Use quando a tarefa pedir teste ponta a ponta, "teste E2E", "spec do Playwright", "cobrir essa tela/fluxo com teste", ou quando uma feature nova de UI precisar de cobertura E2E antes do PR.'
---

# e2e-spec

Contexto de execução (workers, pré-requisitos, estratégia de dados) está em `e2e/README.md` — leia antes. Esta skill é o **padrão de escrita** dos specs.

**Specs de referência:** `e2e/tests/budgets.spec.js` (helpers locais + card escopado) e `e2e/tests/transactions.spec.js` (formulário + linha de tabela).

## Onde colocar

- Tela/feature já tem spec → adicione `test(...)` no `describe` existente.
- Feature nova → `e2e/tests/<feature>.spec.js`, um `test.describe("<Feature em português>")`.

## Esqueleto

```js
import { expect, test } from "@playwright/test";
import { loginAsUser, uniqueUser } from "../helpers/testUser.js";

test.describe("<Feature>", () => {
  test.beforeEach(async ({ page, request }) => {
    await loginAsUser(page, request, uniqueUser("<prefixo-curto>"));
    await page.goto("/<rota>");
  });

  test("<ação> faz <resultado observável>", async ({ page }) => {
    // ...
  });
});
```

## Regras

**Dados**
- Cada teste começa com um usuário novo (`uniqueUser` + `loginAsUser`). Nada de reset de banco, nada de depender de dados de outro teste ou do seed de dev.
- Precisa de pré-condição (ex.: 10 transações)? Crie via API com o `request` e o token que `loginAsUser` retorna, não clicando na UI — a UI de criação já é coberta pelo teste dela.
- Só `auth.spec.js` passa pelo formulário de login/registro. Não duplique isso.

**Locators** (em ordem de preferência)
1. `getByRole("button", { name: "Salvar" })`, `getByRole("row", { name: /Mercado/ })`
2. `getByLabel("Valor")`
3. `getByText(...)` para mensagens exibidas
4. `locator("#id")` só quando o label não é acessível — e vale anotar como débito de acessibilidade no PR
- Escopar em um container (linha, card) antes de agir — o padrão `getGoalCard` do `budgets.spec.js`. Evita clicar no "Excluir" errado quando há vários.
- Funções auxiliares repetidas dentro do spec (ex.: `createGoal`) ficam no próprio arquivo; só vão para `e2e/helpers/` se mais de um spec usar.

**Asserções**
- Sempre `await expect(locator).toBeVisible()/toContainText()` (auto-wait). Nunca `waitForTimeout`.
- Valores monetários aparecem formatados em pt-BR: preencha `"125.50"`, verifique `"125,50"` / `"R$"`.
- Datas: use datas fixas no input (`"2026-08-05"`); se o teste depende do "mês atual" (ex.: progresso de orçamento), calcule a data em runtime.

**Nomes**
- `describe` e `test` em português, descrevendo comportamento: `"excluir uma meta pede confirmação antes de remover"`.
- Comentário em inglês só quando o locator/estratégia não for óbvio (padrão dos specs atuais).

## Evitar

- Diálogos nativos (`window.confirm`) — a UI usa confirmação inline (botão "Confirmar"); se uma feature nova usar `confirm`, sugira trocar.
- Depender dos `retries: 2` do CI para passar. Teste instável localmente = teste errado ou bug real.

## Rodar

```bash
cd e2e
npx playwright test tests/<feature>.spec.js          # só o spec novo
npx playwright test tests/<feature>.spec.js --ui     # para depurar
npm test                                             # tudo, antes do PR
```

Backend e frontend precisam estar no ar (ou o `webServer` do config sobe os dois — mais lento). Rode o spec novo 2-3 vezes seguidas para pegar flakiness antes do PR.
