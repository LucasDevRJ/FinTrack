# Backend architecture

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

Commands, integration-test DB setup, and general repo conventions: see the root `CLAUDE.md` and `AGENTS.md`.
