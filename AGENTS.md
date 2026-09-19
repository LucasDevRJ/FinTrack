# AGENTS.md

Instruções para agentes de IA (Claude Code, Codex, Cursor, etc.) trabalhando neste repositório.

## Sobre o projeto

FinTrack é um gerenciador de finanças pessoais full-stack, construído como projeto de portfólio para atrair clientes freelance (Workana), mas com padrão de qualidade de produção — não é um protótipo descartável. Documentação funcional completa em `README.md`.

- **Repo:** https://github.com/LucasDevRJ/FinTrack (público), monorepo com `/backend`, `/frontend`, `/e2e`
- **Branch principal:** `main` — Vercel (frontend) e Railway (backend+Postgres) fazem auto-deploy a cada push nela
- **Stack:** React 19 (Vite) + Tailwind v4 + `react-router` v8 no frontend; Node.js/Express (ESM) + Prisma + PostgreSQL no backend; JWT (Bearer token, sem cookies); Resend para e-mail transacional; Playwright (E2E) + Vitest/Supertest (unit/integração)
- **Fora de escopo por padrão** (não implementar sem o usuário pedir): multiusuário/times, notificações — confirme antes de expandir escopo por conta própria

Guia técnico detalhado de comandos e arquitetura: ver `CLAUDE.md` na raiz do repo — mantenha os dois arquivos consistentes se um mudar.

## Setup e comandos

```bash
docker compose up -d                 # Postgres local, porta 5433 (raiz do repo)

cd backend && npm install && npm run dev     # API em localhost:3333
cd frontend && npm install && npm run dev    # SPA em localhost:5173
```

Testes:

```bash
cd backend && npm test                # unit + integração (Vitest/Supertest)
cd backend && npm run test:unit
cd backend && npm run test:integration
cd frontend && npm run lint           # oxlint
cd e2e && npm test                    # Playwright, contra localhost real (não mockado)
```

Integração roda contra um Postgres de teste dedicado (`fintrack_test`) — configurar `backend/.env.test` e rodar `npm run test:db:setup` antes da primeira vez. CI (GitHub Actions) roda backend tests + E2E em todo PR/push para `main`.

## Convenções de código

- Backend: cada feature é um módulo autocontido em `backend/src/modules/<nome>/`, sempre dividido em `routes` (Express + middlewares) / `controller` (fino, sem lógica) / `service` (lógica de negócio + Prisma) / `schema` (Zod). Siga esse padrão para qualquer módulo novo.
- Toda busca de recurso é escopada por `userId` no `where` do Prisma, e um miss é sempre 404 (nunca 403) — não vaza se o recurso existe para outro usuário.
- Datas de transação são UTC-midnight; sempre usar getters UTC (`getUTCFullYear()` etc.) ao formatar/bucketizar, nunca métodos de timezone local — bug já mapeado, ver comentários em `transactions.service.js`/`recurring.service.js`.
- Sem cron/scheduler: transações recorrentes são geradas de forma preguiçosa (lazy) a cada leitura de dados de transação, não em background.
- Rotas estáticas (`/summary`, `/export`, `/import`) precisam vir antes de `/:id` no router.
- Frontend: chamadas de API sempre via `src/api/<módulo>.js`, usando o `apiClient` compartilhado (`src/api/client.js`) — nunca lidar com o header de Authorization manualmente. Erros de formulário sempre via `getErrorMessage` (`src/utils/apiError.js`), não `err.response?.data?.message` inline.
- `money`/`category` compartilham validação Zod centralizada em `backend/src/utils/validators.js` — reutilizar, não duplicar regras.

## Workflow obrigatório: issue → branch → commit → push → PR → merge

Este é o padrão de todo o projeto, sem exceção para tarefas pequenas (confirmado com o usuário mesmo para uma alteração pequena de doc):

1. **Criar uma GitHub Issue** antes de começar (título + critério de pronto quando fizer sentido). Labels usados: `enhancement`, `testing`, `chore`, `blocked`, `marketing` (trabalho não-código, ex.: conteúdo/vídeos promocionais).
2. **Criar uma branch por issue**, nomeada `<tipo>/<número>-<slug-descritivo>` (ex.: `feat/41-verificacao-email`, `docs/48-claude-md`, `fix/37-import-csv-delimitador`).
3. **Commitar incrementalmente** conforme o trabalho avança — não acumular tudo num commit só no final. Cada commit deve corresponder a uma unidade coerente de trabalho (ex.: schema+migration, depois rotas, depois frontend), e a mensagem referenciar a issue quando fizer sentido.
4. **Dar push** da branch.
5. **Abrir PR** referenciando `Closes #N`, aguardar os checks de CI (test/playwright) passarem.
6. **Merge** (squash, com delete da branch) — mesmo sendo o único revisor, o usuário confirmou preferir PR+merge a um merge direto local, pelo histórico/rastreabilidade no GitHub.

Trabalho não-código (ex.: planejamento de conteúdo/marketing) usa apenas a Issue como checklist/discussão — não precisa do fluxo branch→PR→merge, já que não há nada para mergear.

## Antes de decisões estruturais

Explicar brevemente (poucos bullets, não um texto longo) antes de instalar dependências novas ou tomar decisões arquiteturais importantes — o usuário prefere entender o porquê antes, e pergunta se quiser mais profundidade.

Ao propor ou priorizar itens de backlog, considerar tanto o apelo de portfólio/cliente quanto o valor real para o usuário final (não escolher itens só por impressionarem num freelance client).
