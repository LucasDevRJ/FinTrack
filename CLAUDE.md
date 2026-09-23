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

## Arquitetura do backend

Ver `backend/CLAUDE.md`.

## Arquitetura do frontend

Ver `frontend/CLAUDE.md`.

## Convenções de workflow

Ver `AGENTS.md`.
