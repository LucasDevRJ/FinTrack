# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FinTrack is a full-stack personal finance manager (Portuguese-language product, portfolio project held to production quality: real deploy, automated tests, organized commit/PR history). See `README.md` for the feature list and stack table.

## Commands

### Local environment

```bash
docker compose up -d          # Postgres on localhost:5433 (repo root)
```

Backend/frontend/E2E commands: `npm install && npm run dev` in each of `backend/`, `frontend/`, `e2e/` — see each package's `scripts` block (`backend/package.json`, `frontend/package.json`, `e2e/package.json`) for the full list (tests, lint, Prisma, etc.).

Test files run with `fileParallelism: false` (see `backend/vitest.config.js`) because integration tests share one Postgres test DB — setup steps are in the root `README.md`'s "Testes" section.

E2E gotchas (worker count, data strategy): see `e2e/README.md`.

CI (GitHub Actions, `.github/workflows/`) runs backend tests and E2E on every PR/push to `main`.

## Backend architecture

See `backend/CLAUDE.md`.

## Frontend architecture

See `frontend/CLAUDE.md`.

## Workflow conventions

See `AGENTS.md`.
