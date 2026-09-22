---
name: backend-module
description: Roteiro para criar um módulo/recurso novo na API do FinTrack (backend Express + Prisma + Zod) ponta a ponta — model/migration, routes/controller/service/schema, registro no app.js, testes de integração e wrapper em frontend/src/api. Use sempre que a tarefa envolver um endpoint ou recurso novo no backend ("cria a API de X", "novo módulo", "endpoint para tags/metas/contas", "CRUD de ..."), ou adicionar um model novo ao schema.prisma, mesmo que o usuário não fale em "módulo".
---

# backend-module

As convenções de arquitetura estão em `backend/CLAUDE.md` (leia antes). Esta skill é o **roteiro de execução**: a ordem dos passos e o checklist de coisas que já quebraram ou quase quebraram neste repo.

**Módulo de referência:** `backend/src/modules/budgets/` — CRUD pequeno e completo com ownership, 409 de conflito e serialização de `Decimal`. Copie a *forma* dele em vez de inventar uma nova. Siga o nome no plural (`budgets`, `transactions`) e mensagens de erro/validação **em português**.

Pré-requisito: issue + branch já criadas (skill `start-issue`).

## Passo 1 — Model e migration (se houver tabela nova)

Em `backend/prisma/schema.prisma`, siga o formato do `BudgetGoal`:

- `id String @id @default(uuid())`, `createdAt`, `updatedAt @updatedAt`
- `userId` + `user User @relation(..., onDelete: Cascade)` — a exclusão de conta depende do cascade
- Dinheiro é `Decimal @db.Decimal(12, 2)`, nunca `Float`
- `@@map("nome_em_snake_case_plural")`
- Adicione o campo inverso no model `User`

```bash
cd backend && npx prisma migrate dev --name <descricao_em_snake_case>
```

⚠️ **Adicione o model novo ao `resetDb()` em `backend/tests/setup/db.js`**, respeitando a ordem filho → pai (antes de `user`). Sem isso, os testes de integração acumulam dados entre si e ficam flaky.

**Commit:** schema + migration + resetDb.

## Passo 2 — Os quatro arquivos em `backend/src/modules/<nome>/`

**`<nome>.schema.js`** — Zod. Reaproveite `categorySchema` / `moneyAmountSchema` de `src/utils/validators.js` em vez de redefinir. Update = `create.partial().refine(...)` exigindo ao menos um campo. `idParamSchema` com `.uuid("ID inválido")`.

**`<nome>.service.js`** — toda a lógica e todo Prisma:
- Crie um `findOwned<Recurso>(userId, id)` que faz `findFirst({ where: { id, userId } })` e lança `new AppError("<Recurso> não encontrado(a)", 404)`. **Todo** update/delete passa por ele antes. Nunca 403 — um 404 não confirma que o id existe para outro usuário.
- `findMany` sempre com `where: { userId }`.
- Converta `Decimal` → `Number` antes de devolver (`serialize<Recurso>`), senão o JSON sai como string.
- Datas: só getters UTC (`getUTCFullYear/Month/Date`, `Date.UTC(...)`). Nunca `getMonth()`/`toLocaleDateString` — em UTC-3 a data vira o dia anterior.
- Se o recurso lê dados de transações, chame `await generateDueRecurringTransactions(userId)` primeiro (as recorrências são geradas de forma lazy — ver `backend/CLAUDE.md`).
- Isole cálculos puros em funções exportadas (como `calculateGoalProgress`) para ter teste unitário sem banco.

**`<nome>.controller.js`** — fino: `try { service(req.userId, req.body/params/query) ; res.status(...) } catch (err) { next(err) }`. Status: 201 no create, 200 no get/update, 204 (`.send()`) no delete. Nenhuma regra de negócio aqui.

**`<nome>.routes.js`** — `router.use(protect)` no topo, `validate(schema)` para body e `validate(schema, "params"|"query")` para os demais.
⚠️ Sub-rotas estáticas (`/summary`, `/export`) **antes** de `/:id`, senão o Express as trata como id e o schema de UUID as rejeita.

**Commit:** módulo.

## Passo 3 — Registrar em `backend/src/app.js`

Importe o router junto aos outros e monte com `app.use("/api/<nome>", <nome>Routes);` **antes** de `notFoundHandler`/`errorHandler`. Se a resposta tiver um header novo que o frontend precise ler, adicione em `exposedHeaders` do CORS.

## Passo 4 — Testes

Crie `backend/tests/integration/<nome>.routes.test.js` seguindo `budgets.routes.test.js` (`beforeEach(resetDb)`, `afterAll(() => prisma.$disconnect())`, `createAuthenticatedUser` + `authHeader`). Cobertura mínima:

- [ ] create feliz (201) e payload inválido (400)
- [ ] list só devolve dados do próprio usuário
- [ ] update/delete de um recurso **de outro usuário** → 404 (o teste de ownership, obrigatório)
- [ ] id que não é UUID → 400
- [ ] sem token → 401
- [ ] regra de negócio específica (ex.: 409 de duplicata)

Lógica pura → `backend/tests/unit/<nome>.<assunto>.test.js`.

```bash
cd backend && npm test
```

Se falhar por banco, veja a seção "Testes" do `README.md` raiz (`npm run test:db:setup`). Não avance com teste vermelho.

**Commit:** testes.

## Passo 5 — Wrapper no frontend

`frontend/src/api/<nome>.js` no formato de `budgets.js`: funções `<verbo><Recurso>Request` usando `apiClient`, devolvendo `data`. Nunca monte o header `Authorization` na mão — o interceptor do `client.js` já faz isso.

UI (página/componentes/rota em `App.jsx` com `ProtectedRoute`) só se estiver no critério de pronto da issue. Se houver UI nova, considere a skill `e2e-spec`.

**Commit:** wrapper (+ UI).

## Passo 6 — Documentação viva

Atualize a lista "Módulos atuais" em `backend/CLAUDE.md` e, se mudou um comportamento de arquitetura, descreva ali mesmo — no mesmo PR. Depois, skill `ship-pr`.
