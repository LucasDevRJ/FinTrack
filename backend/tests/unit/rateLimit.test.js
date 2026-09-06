import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createAuthLimiter } from "../../src/middleware/rateLimit.js";

// Builds a throwaway app with the limiter mounted, using a low `limit`
// override so the test doesn't need to fire 10+ requests to hit it. The
// route returns 401 by default because skipSuccessfulRequests only counts
// failed attempts toward the quota — the same shape as a real failed login.
function buildApp(limiterOptions, { status = 401 } = {}) {
  const app = express();
  app.use(createAuthLimiter(limiterOptions));
  app.get("/", (req, res) => res.status(status).json({ ok: status < 400 }));
  return app;
}

describe("createAuthLimiter", () => {
  it("allows failed requests up to the configured limit", async () => {
    const app = buildApp({ limit: 3 });

    for (let i = 0; i < 3; i++) {
      const res = await request(app).get("/");
      expect(res.status).toBe(401);
    }
  });

  it("blocks with 429 once failed requests exceed the limit", async () => {
    const app = buildApp({ limit: 3 });

    for (let i = 0; i < 3; i++) {
      await request(app).get("/");
    }

    const res = await request(app).get("/");
    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/Muitas tentativas/);
  });

  it("doesn't count successful requests against the quota", async () => {
    const app = buildApp({ limit: 3 }, { status: 200 });

    for (let i = 0; i < 10; i++) {
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
    }
  });

  it("respects the skip option (used to disable it under NODE_ENV=test)", async () => {
    const app = buildApp({ limit: 1, skip: () => true });

    for (let i = 0; i < 5; i++) {
      const res = await request(app).get("/");
      expect(res.status).toBe(401);
    }
  });
});
