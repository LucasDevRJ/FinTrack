# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Projeto

FinTrack é um gerenciador de finanças pessoais full-stack (produto em português, projeto de portfólio mantido em padrão de produção: deploy real, testes automatizados, histórico de commits/PRs organizado). Ver `README.md` para a lista de funcionalidades e a tabela de stack.

## Comandos

### Ambiente local

```bash
docker compose up -d          # Postgres em localhost:5433 (raiz do repo)
```

Comandos de backend/frontend/E2E: `npm install && npm run dev` em cada um de `backend/`, `frontend/`, `e2e/` — ver o bloco `scripts` de cada pacote (`backend/package.json`, `frontend/package.json`, `e2e/package.json`) para a lista completa (testes, lint, Prisma, etc.).

Os arquivos de teste rodam com `fileParallelism: false` (ver `backend/vitest.config.js`) porque os testes de integração compartilham um único banco de teste do Postgres — os passos de configuração estão na seção "Testes" do `README.md` raiz.

Particularidades do E2E (número de workers, estratégia de dados): ver `e2e/README.md`.

CI (GitHub Actions, `.github/workflows/`) roda os testes de backend e o E2E em todo PR/push para `main`.

## Arquitetura do backend

Ver `backend/CLAUDE.md`.

## Arquitetura do frontend

Ver `frontend/CLAUDE.md`.

## Convenções de workflow

Ver `AGENTS.md`.
