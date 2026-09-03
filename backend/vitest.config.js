import { defineConfig, loadEnv } from "vite";

// Vitest runs in "test" mode by default, so this picks up backend/.env.test
// the same way Vite loads .env.<mode> files — keeps test env vars (test DB
// URL, dummy JWT secret) out of the regular .env used by `npm run dev`.
export default defineConfig(({ mode }) => ({
  test: {
    env: loadEnv(mode, process.cwd(), ""),
    // Integration tests share one real Postgres test DB and truncate it
    // between tests (see tests/setup/db.js) — running test files in
    // parallel would let them stomp on each other's data.
    fileParallelism: false,
  },
}));
