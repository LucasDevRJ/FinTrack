// Integration tests for /api/recurring: template CRUD plus the lazy
// generation contract end-to-end through the real API — creating a
// template with a past startDate, then reading transactions, should
// materialize the due occurrences without any cron/scheduler involved.
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { authHeader, createAuthenticatedUser } from "../setup/auth.js";
import { prisma, resetDb } from "../setup/db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

function pastDate(monthsAgo) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1))
    .toISOString()
    .slice(0, 10);
}

describe("POST /api/recurring", () => {
  it("creates a template without generating any transaction yet", async () => {
    const { token } = await createAuthenticatedUser();

    const res = await request(app)
      .post("/api/recurring")
      .set(authHeader(token))
      .send({
        type: "EXPENSE",
        amount: 1400,
        category: "Moradia",
        dayOfMonth: 1,
        startDate: pastDate(2),
      });

    expect(res.status).toBe(201);
    expect(res.body.lastGeneratedDate).toBeNull();
  });

  it("rejects endDate: null as a rejection is NOT expected (regression: null must be accepted)", async () => {
    const { token } = await createAuthenticatedUser();

    const res = await request(app)
      .post("/api/recurring")
      .set(authHeader(token))
      .send({
        type: "EXPENSE",
        amount: 50,
        category: "Assinaturas",
        dayOfMonth: 5,
        startDate: pastDate(0),
        endDate: null,
      });

    expect(res.status).toBe(201);
  });
});

describe("lazy generation via GET /api/transactions", () => {
  it("materializes past-due occurrences from an active template on read", async () => {
    const { token } = await createAuthenticatedUser();

    await request(app)
      .post("/api/recurring")
      .set(authHeader(token))
      .send({
        type: "EXPENSE",
        amount: 1400,
        category: "Moradia",
        dayOfMonth: 1,
        startDate: pastDate(2), // due for 3 months (2 months ago, last month, this month)
      });

    const listRes = await request(app).get("/api/transactions").set(authHeader(token));

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(3);
    expect(listRes.body.data.every((t) => t.category === "Moradia")).toBe(true);
  });

  it("is idempotent — reading twice in a row doesn't double-generate", async () => {
    const { token } = await createAuthenticatedUser();

    await request(app)
      .post("/api/recurring")
      .set(authHeader(token))
      .send({
        type: "INCOME",
        amount: 5000,
        category: "Salário",
        dayOfMonth: 5,
        startDate: pastDate(1),
      });

    await request(app).get("/api/transactions").set(authHeader(token));
    const second = await request(app).get("/api/transactions").set(authHeader(token));

    // 1 month ago + this month = at most 2 occurrences, whichever the
    // template's dayOfMonth has actually reached — the point is it doesn't
    // grow between calls, so we compare counts across the two live reads.
    const first = await request(app).get("/api/transactions").set(authHeader(token));
    expect(second.body.data.length).toBe(first.body.data.length);
  });
});

describe("DELETE /api/recurring/:id", () => {
  it("unlinks already-generated transactions instead of deleting them", async () => {
    const { token } = await createAuthenticatedUser();

    const created = await request(app)
      .post("/api/recurring")
      .set(authHeader(token))
      .send({
        type: "EXPENSE",
        amount: 100,
        category: "Assinaturas",
        dayOfMonth: 1,
        startDate: pastDate(1),
      });

    // Trigger generation.
    await request(app).get("/api/transactions").set(authHeader(token));

    const del = await request(app)
      .delete(`/api/recurring/${created.body.id}`)
      .set(authHeader(token));
    expect(del.status).toBe(204);

    const list = await request(app).get("/api/transactions").set(authHeader(token));
    expect(list.body.data.length).toBeGreaterThan(0);
    expect(list.body.data.every((t) => t.recurringTransactionId === null)).toBe(true);
  });
});
