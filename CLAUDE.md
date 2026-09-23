# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Projeto

FinTrack é um gerenciador de finanças pessoais full-stack (produto em português, projeto de portfólio mantido em padrão de produção: deploy real, testes automatizados, histórico de commits/PRs organizado). Ver `README.md` para a lista de funcionalidades e a tabela de stack.

## Comandos

### Ambiente local

```bash
docker compose up -d          # Postgres em localhost:5433 (raiz do repo)
```

Comandos de backend/frontend/E2E: `npm install && npm run dev` em cada um de `backend/`, `frontend/`, `e2e/` — ver o bloco `scripts` de cada pacote (`backend/package.json`, `frontend/package.json`, `e2e/package.json`) para a lista completa (testes, Prisma, etc.). Formatação e lint são da raiz (abaixo).

Os arquivos de teste rodam com `fileParallelism: false` (ver `backend/vitest.config.js`) porque os testes de integração compartilham um único banco de teste do Postgres — os passos de configuração estão na seção "Testes" do `README.md` raiz.

Particularidades do E2E (número de workers, estratégia de dados): ver `e2e/README.md`.

### Formatação e lint

```bash
npm install                   # na raiz: tooling do monorepo (Prettier + oxlint), não é usado pelos deploys
npm run format                # formata todo JS/JSX
npm run format:check          # o que o CI roda
npm run lint                  # oxlint em backend/frontend/e2e; aviso também falha (--deny-warnings)
git config blame.ignoreRevsFile .git-blame-ignore-revs   # uma vez por clone
```

Config em `.prettierrc.json` (só o que difere do padrão do Prettier). Não formatar à mão nem discutir estilo mecânico em revisão — o Prettier decide. Markdown/YAML ficam fora do Prettier de propósito.

Lint em `.oxlintrc.json` (regras de React só em `frontend/**`, via `overrides`). Aviso que é falso positivo se resolve na regra (ex.: `ignoreRestSiblings` para o padrão `const { password, ...safe } = user`) ou com `// oxlint-disable-next-line <regra> -- <motivo>` na linha — nunca seguindo a sugestão do linter no automático: remover o `next` não usado do `errorHandler` quebraria o Express, que reconhece error handler pela aridade 4 (por isso `_next`).

Commits só de formatação vão para `.git-blame-ignore-revs` (hash do squash, depois do merge).

CI (GitHub Actions, `.github/workflows/`) roda formatação + lint (`Code quality`), os testes de backend e o E2E em todo PR/push para `main`.

## Convenções de código

Só o que Prettier/oxlint não verificam. Regras de arquitetura (ownership 404, datas UTC, ordem de rotas etc.) estão em `backend/CLAUDE.md` / `frontend/CLAUDE.md`.

**Idioma por camada** — escolhido pelo público de cada uma; nunca misturar dentro da mesma camada:

| Camada | Idioma |
|---|---|
| Identificadores, comentários, nomes de teste unit/integração | Inglês (lidos junto com o código e as APIs das libs) |
| Tudo que o usuário vê: UI, `AppError`, mensagens de validação Zod | Português — campo obrigatório/tipo inválido/limites sem mensagem própria já saem em PT pelo error map global (`backend/src/utils/zodErrorMap.js`, #71) |
| Nomes de teste E2E (`test("excluir uma meta pede confirmação...")`) | Português — descrevem comportamento do produto, na língua do produto |
| Docs `.md`, issues, commits, PRs | Português |

**Comentários explicam o porquê, não o quê.** Escrever quando a razão não é óbvia pelo código: restrição externa (aridade do Express, limite do `express.json`), bug que o código evita (fuso UTC-3), trade-off escolhido. Citar o arquivo/função que segue o mesmo padrão ("same ownership-scoping pattern as `findOwnedTransaction`") em vez de reexplicar. Sem comentário narrando a linha seguinte, sem código comentado, sem `TODO` solto — pendência vira GitHub Issue.

**Nomes**
- Backend: `<modulo>.<camada>.js` (`budgets.service.js`); busca com ownership = `findOwned<Recurso>`; conversão para resposta = `serialize<Recurso>`.
- Frontend: wrappers de API `<verbo><Recurso>Request` (`createBudgetGoalRequest`); componentes/páginas em PascalCase `.jsx`.
- Parâmetro obrigatório pela assinatura mas não usado: prefixo `_` (`_next`).

**Módulos (ESM)**
- Imports relativos sempre com extensão `.js` no backend (Node ESM exige).
- `export default` só para: routers Express, singletons de `lib/`, `app.js`, e componentes/páginas React. Services, controllers, schemas, utils e contexts usam named exports (`import * as budgetsService`).

**Erros e logs**
- Erro esperado → `throw new AppError(mensagemEmPT, status)`; nunca `res.status(...)` direto de dentro do service. Erro inesperado sobe para o `errorHandler` (vira 500 genérico — detalhes internos nunca vão para a resposta).
- `console.*` só no `errorHandler` e no boot do `server.js`.

**Funções puras separadas do I/O** quando há cálculo (ex.: `calculateGoalProgress`, exportada para teste unitário sem banco).

## Arquitetura do backend

Ver `backend/CLAUDE.md`.

## Arquitetura do frontend

Ver `frontend/CLAUDE.md`.

## Convenções de workflow

Ver `AGENTS.md`.
