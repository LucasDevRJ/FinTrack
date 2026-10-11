import { defineConfig, devices } from "@playwright/test";

const FRONTEND_URL = "http://localhost:5173";
const BACKEND_HEALTH_URL = "http://localhost:3333/api/health";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  // The backend dev server (`node --watch`) is a single unclustered
  // process, not built to take a burst of concurrent requests — running
  // with the default (CPU-count) workers overwhelmed it and caused
  // ECONNRESET/timeouts across the board. Locally (Windows) even 2 workers
  // made page.goto hang for 30s on the Vite dev server, mid-run and not only
  // on the first wave, while 1 worker passed 25/25 twice and was no slower
  // (#88). CI (Linux) never showed it and keeps 2.
  workers: process.env.CI ? 2 : 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: FRONTEND_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Playwright starts both servers itself (backend with NODE_ENV=test) and
  // stops them at the end — the recommended way to run (e2e/README.md).
  // reuseExistingServer reuses whatever already answers on these URLs, so a
  // backend started by hand without NODE_ENV=test makes every signup fail.
  webServer: [
    {
      command: "npm run dev",
      cwd: "../backend",
      url: BACKEND_HEALTH_URL,
      reuseExistingServer: true,
      timeout: 30_000,
      // Skips the Resend call on register (mailer.js; it only delivers to the
      // account owner, so every test signup 500s) and the auth rate limiter
      // (it counts failed attempts per IP, and the suite fails logins on
      // purpose). Same as the CI workflow.
      // Does not switch databases: server.js only loads backend/.env.
      env: { NODE_ENV: "test" },
    },
    {
      command: "npm run dev",
      cwd: "../frontend",
      url: FRONTEND_URL,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
