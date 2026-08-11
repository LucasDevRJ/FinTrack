import { defineConfig, devices } from "@playwright/test";

const FRONTEND_URL = "http://localhost:5173";
const BACKEND_HEALTH_URL = "http://localhost:3333/api/health";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  // The backend dev server (`node --watch`) is a single unclustered
  // process, not built to take a burst of concurrent requests — running
  // with the default (CPU-count) workers overwhelmed it and caused
  // ECONNRESET/timeouts across the board. Capped low here since this suite
  // targets a local dev server, not a production-grade one.
  workers: 2,
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

  // Assumes `npm run dev` is already running for both backend and frontend
  // (matches how Lucas normally develops locally) — reuseExistingServer
  // here means Playwright checks the URL and only spawns its own copy if
  // nothing answers, instead of always trying to start a second instance.
  webServer: [
    {
      command: "npm run dev",
      cwd: "../backend",
      url: BACKEND_HEALTH_URL,
      reuseExistingServer: true,
      timeout: 30_000,
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
