// Integration tests for /api/budgets: the case-insensitive duplicate-
// category rejection (409) and the live progress calc (GET reflects actual
// EXPENSE transactions for the current month), both against a real DB.
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { authHeader, createAuthenticatedUser } from "../setup/auth.js";
import { prisma, resetDb } from "../setup/db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function authedUser() {
  const { token } = await createAuthenticatedUser();
  return token;
}

describe("POST /api/budgets", () => {
  it("creates a budget goal", async () => {
    const token = await authedUser();

    const res = await request(app)
      .post("/api/budgets")
      .set(authHeader(token))
      .send({ category: "Mercado", monthlyLimit: 700 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ category: "Mercado", monthlyLimit: 700 });
  });

  it("rejects a duplicate category case-insensitively", async () => {
    const token = await authedUser();
    await request(app)
      .post("/api/budgets")
      .set(authHeader(token))
      .send({ category: "Mercado", monthlyLimit: 700 });

    const res = await request(app)
      .post("/api/budgets")
      .set(authHeader(token))
      .send({ category: "mercado", monthlyLimit: 500 });

    expect(res.status).toBe(409);
  });

  it("allows the same category name for two different users", async () => {
    const alice = await createAuthenticatedUser({ email: "alice-budget@example.com" });
    const bob = await createAuthenticatedUser({ email: "bob-budget@example.com" });

    await request(app)
      .post("/api/budgets")
      .set(authHeader(alice.token))
      .send({ category: "Mercado", monthlyLimit: 700 });
    const res = await request(app)
      .post("/api/budgets")
      .set(authHeader(bob.token))
      .send({ category: "Mercado", monthlyLimit: 400 });

    expect(res.status).toBe(201);
  });
});

describe("GET /api/budgets", () => {
  it("computes live spent/remaining/percentage from this month's expenses", async () => {
    const token = await authedUser();

    await request(app)
      .post("/api/budgets")
      .set(authHeader(token))
      .send({ category: "Transporte", monthlyLimit: 200 });

    const today = new Date().toISOString().slice(0, 10);
    await request(app)
      .post("/api/transactions")
      .set(authHeader(token))
      .send({ type: "EXPENSE", amount: 240, category: "Transporte", date: today });

    const res = await request(app).get("/api/budgets").set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ spent: 240, remaining: -40, percentage: 120 });
  });
});

describe("DELETE /api/budgets/:id", () => {
  it("returns 404 for another user's goal", async () => {
    const alice = await createAuthenticatedUser({ email: "alice-budget2@example.com" });
    const bob = await createAuthenticatedUser({ email: "bob-budget2@example.com" });

    const created = await request(app)
      .post("/api/budgets")
      .set(authHeader(alice.token))
      .send({ category: "Lazer", monthlyLimit: 300 });

    const res = await request(app)
      .delete(`/api/budgets/${created.body.id}`)
      .set(authHeader(bob.token));

    expect(res.status).toBe(404);
  });
});
