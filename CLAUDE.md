# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FinTrack is a full-stack personal finance manager (Portuguese-language product, portfolio project held to production quality: real deploy, automated tests, organized commit/PR history). See `README.md` for the feature list and stack table.

- Frontend: React 19 (Vite), Tailwind CSS v4, React Router, Recharts, Axios — `frontend/`
- Backend: Node.js/Express, module-per-feature (schema/service/controller/routes) — `backend/`
- Database: PostgreSQL + Prisma ORM
- Auth: JWT (Bearer token)
- Transactional e-mail: Resend
- Tests: Playwright (E2E, `e2e/`), Vitest (unit) + Supertest (integration, `backend/tests/`)
- Deploy: Vercel (frontend) + Railway (backend + Postgres)

## Commands

### Local environment

```bash
docker compose up -d          # Postgres on localhost:5433 (repo root)
```

### Backend (`backend/`)

```bash
npm run dev                   # http://localhost:3333, node --watch
npm test                      # unit + integration (vitest run)
npm run test:watch
npm run test:unit             # tests/unit only
npm run test:integration      # tests/integration only
npx vitest run tests/unit/csv.parse.test.js   # single file
npm run test:db:setup         # applies migrations to the .env.test DB (fintrack_test)
npm run prisma:migrate        # create/apply a dev migration
npm run prisma:studio
npm run user:delete           # scripts/delete-user.js, one-off admin script
```

Integration tests hit a real dedicated Postgres DB (`fintrack_test`) and truncate between tests — set `DATABASE_URL` in `backend/.env.test` (copy from `.env.example`) and run `npm run test:db:setup` once before `npm test`. Test files run with `fileParallelism: false` (see `backend/vitest.config.js`) because integration tests share that one DB.

### Frontend (`frontend/`)

```bash
npm run dev                   # http://localhost:5173
npm run build
npm run lint                  # oxlint
npm run preview
```

### E2E (`e2e/`)

```bash
npx playwright install chromium   # first time only
npm test                          # runs against localhost:5173 + localhost:3333 (real, not mocked)
npm run test:ui
npm run test:headed
npm run report
```

Playwright's `webServer` config can boot frontend+backend itself, but starting them manually first is faster. Config runs only 2 workers locally — the dev backend (`node --watch`) is a single, non-clustered process and can't take full concurrency (see `e2e/README.md`). `auth.spec.js` is the only spec that logs in through the real UI form; other specs authenticate via API (`loginAsUser` helper) to stay focused and fast. Each test registers a fresh user with a unique e-mail (timestamp + random, `e2e/helpers/testUser.js`) rather than relying on DB resets.

CI (GitHub Actions, `.github/workflows/`) runs backend tests and E2E on every PR/push to `main`.

## Backend architecture

Each feature is a self-contained module under `backend/src/modules/<name>/`, always split the same four ways:

- `*.routes.js` — Express router; wires middleware (`protect`, `validate(schema[, source])`) to controller methods
- `*.controller.js` — thin: pulls `req.userId`/`req.body`/`req.params`/`req.query`, calls the service, sets the HTTP response. No business logic.
- `*.service.js` — business logic and all Prisma calls
- `*.schema.js` — Zod schemas used by `validate()` for request validation

Current modules: `auth`, `transactions`, `budgets`, `recurring`.

Cross-cutting pieces live outside `modules/`:
- `src/middleware/auth.js` — `protect` reads `Authorization: Bearer <token>`, verifies it, sets `req.userId`
- `src/middleware/validate.js` — Zod-parses `req.body`/`req.query`/`req.params` and replaces it with the parsed/typed value; validation failures become `ZodError`s forwarded to `next()`
- `src/middleware/errorHandler.js` — central error handler: `ZodError` → 400 with per-field messages, `AppError` → its own status code, anything else → logged + 500
- `src/utils/AppError.js` — `new AppError(message, statusCode)` for expected/handled errors (e.g. 404 "not found", 401 "invalid token")
- `src/lib/prisma.js`, `src/lib/resend.js` — shared client singletons

**Ownership pattern**: every resource lookup is scoped by `userId` in the Prisma `where` clause (e.g. `findFirst({ where: { id, userId } })`), and a miss is always a 404, never a 403 — this avoids leaking whether a resource exists for a different user. See `findOwnedTransaction` / `findOwnedRecurringTransaction` in the respective services.

**Route ordering**: static sub-paths (`/summary`, `/export`, `/import`) must be registered before `/:id` in a router, or Express matches them as the `:id` param and the UUID schema rejects them.

**Date handling**: transaction dates are stored as UTC midnight for a calendar date. Reading them with local-timezone methods (`toLocaleDateString`, `getMonth()`) can shift the date by a day depending on server timezone (e.g. UTC-3 makes UTC midnight read as the previous day). Always bucket/format dates using the UTC getters (`getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()`) — see `transactions.service.js` and `recurring.service.js` for the established pattern.

**Recurring transactions have no scheduler/cron** (Railway backend has no worker service). Instead, `recurring.service.js` generates past-due occurrences lazily: every read path that touches transaction data (transactions list, dashboard summary, CSV export, budget progress, and the recurring list itself) first calls `generateDueRecurringTransactions(userId)`, which walks each active template month-by-month from `lastGeneratedDate` (or `startDate`) up to today, materializes any due occurrences as real `Transaction` rows, and stamps `lastGeneratedDate`. This makes repeat calls a cheap no-op once caught up. `dayOfMonth` is clamped to the actual last day of shorter months (e.g. 31 → Feb 28/29).

**CSV import/export**: `express.json()` limit is raised to 2mb (default 100kb) specifically because CSV import content is JSON-escaped inside the request body and can hold up to `MAX_IMPORT_ROWS` rows. Export responses set `Content-Disposition`, which requires the CORS `exposedHeaders` allow-list in `app.js` for the frontend to read it.

**Backend runs behind Railway's reverse proxy** — `app.set("trust proxy", 1)` in `app.js` is required for `express-rate-limit` (and anything else reading `req.ip`) to see the real client IP instead of the proxy's.

## Frontend architecture

- `src/api/*.js` — one file per backend module, thin wrappers around a shared `apiClient` (`src/api/client.js`, an Axios instance). A request interceptor attaches `Authorization: Bearer <token>` from `localStorage["fintrack_token"]` automatically — API call sites never handle auth headers themselves.
- `src/context/AuthContext.jsx` — holds `user`/`isLoading` and all auth actions (login, register + e-mail verification flow, password change, account deletion, demo login). On mount, if a token survived a refresh, it's validated via `meRequest()` before rendering protected content.
- `src/context/ThemeContext.jsx` — dark mode, persisted preference + system detection.
- `src/components/ProtectedRoute.jsx` — route guard used in `App.jsx` for every authenticated page.
- Routing (`src/App.jsx`) is a flat `react-router` `<Routes>` tree; there's no nested layout routing.
- `src/utils/demo.js` — `isDemoUser(user)` gates behavior that shouldn't apply to the shared public "Entrar como visitante" account (e.g. `/account` redirects to `/dashboard` instead of showing profile/delete-account UI — see `AccountRoute` in `App.jsx`, issue #13).

**Registration doesn't log the user in.** `register()` no longer returns a token — the account must verify its e-mail first (`verifyEmail(token)` is what stores the token and sets `user`). Similarly, `confirmEmailChange` re-issues and replaces the stored token, since the e-mail identity just changed.

## Workflow conventions (from project memory)

- GitHub Issues + branch-per-issue; PRs reference the issue number.
- Commit incrementally; briefly explain non-obvious decisions before making them.
- Weigh feature work by real end-user value, not portfolio appeal.
