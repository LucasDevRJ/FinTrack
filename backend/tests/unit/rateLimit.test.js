import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createAuthLimiter } from "../../src/middleware/rateLimit.js";

// Builds a throwaway app with the limiter mounted, using a low `limit`
// override so the test doesn't need to fire 10+ requests to hit it.
function buildApp(limiterOptions) {
  const app = express();
  app.use(createAuthLimiter(limiterOptions));
  app.get("/", (req, res) => res.status(200).json({ ok: true }));
  return app;
}

describe("createAuthLimiter", () => {
  it("allows requests up to the configured limit", async () => {
    const app = buildApp({ limit: 3 });

    for (let i = 0; i < 3; i++) {
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
    }
  });

  it("blocks with 429 once the limit is exceeded", async () => {
    const app = buildApp({ limit: 3 });

    for (let i = 0; i < 3; i++) {
      await request(app).get("/");
    }

    const res = await request(app).get("/");
    expect(res.status).toBe(429);
    expect(res.body.message).toMatch(/Muitas tentativas/);
  });

  it("respects the skip option (used to disable it under NODE_ENV=test)", async () => {
    const app = buildApp({ limit: 1, skip: () => true });

    for (let i = 0; i < 5; i++) {
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
    }
  });
});
