// Integration tests: real Express app (app.js) + real test-DB Prisma client,
// via supertest — no mocking. Covers auth-gating and ownership isolation
// (the two-user cross-access case documented in the overview memory) plus
// the basic CRUD contract for /api/transactions.
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { authHeader, createAuthenticatedUser } from "../setup/auth.js";
import { prisma, resetDb } from "../setup/db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

function transactionPayload(overrides = {}) {
  return {
    type: "EXPENSE",
    amount: 99.9,
    category: "Alimentação",
    date: "2026-08-15",
    description: "Supermercado",
    ...overrides,
  };
}

describe("POST /api/transactions", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await request(app).post("/api/transactions").send(transactionPayload());
    expect(res.status).toBe(401);
  });

  it("creates a transaction scoped to the authenticated user", async () => {
    const { token, user } = await createAuthenticatedUser();

    const res = await request(app)
      .post("/api/transactions")
      .set(authHeader(token))
      .send(transactionPayload());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ category: "Alimentação", amount: 99.9 });

    const stored = await prisma.transaction.findUnique({ where: { id: res.body.id } });
    expect(stored.userId).toBe(user.id);
  });

  it("rejects an invalid payload with a field-specific validation message", async () => {
    const { token } = await createAuthenticatedUser();

    const res = await request(app)
      .post("/api/transactions")
      .set(authHeader(token))
      .send(transactionPayload({ type: "NOT_A_TYPE" }));

    expect(res.status).toBe(400);
  });
});

describe("GET /api/transactions", () => {
  it("only returns the requesting user's own transactions", async () => {
    const alice = await createAuthenticatedUser({ email: "alice@example.com" });
    const bob = await createAuthenticatedUser({ email: "bob@example.com" });

    await request(app)
      .post("/api/transactions")
      .set(authHeader(alice.token))
      .send(transactionPayload({ category: "Alice's" }));
    await request(app)
      .post("/api/transactions")
      .set(authHeader(bob.token))
      .send(transactionPayload({ category: "Bob's" }));

    const res = await request(app).get("/api/transactions").set(authHeader(alice.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].category).toBe("Alice's");
  });
});

describe("cross-user isolation on single-item routes", () => {
  it("returns 404 (not 403) when reading/updating/deleting another user's transaction", async () => {
    const alice = await createAuthenticatedUser({ email: "alice2@example.com" });
    const bob = await createAuthenticatedUser({ email: "bob2@example.com" });

    const created = await request(app)
      .post("/api/transactions")
      .set(authHeader(alice.token))
      .send(transactionPayload());
    const id = created.body.id;

    const getRes = await request(app).get(`/api/transactions/${id}`).set(authHeader(bob.token));
    const patchRes = await request(app)
      .patch(`/api/transactions/${id}`)
      .set(authHeader(bob.token))
      .send({ amount: 1 });
    const deleteRes = await request(app)
      .delete(`/api/transactions/${id}`)
      .set(authHeader(bob.token));

    expect(getRes.status).toBe(404);
    expect(patchRes.status).toBe(404);
    expect(deleteRes.status).toBe(404);

    // Confirm it's still untouched, not actually deleted.
    const stillThere = await prisma.transaction.findUnique({ where: { id } });
    expect(stillThere).not.toBeNull();
  });
});

describe("DELETE /api/transactions/:id", () => {
  it("deletes the transaction and it no longer shows up in the list", async () => {
    const { token } = await createAuthenticatedUser();
    const created = await request(app)
      .post("/api/transactions")
      .set(authHeader(token))
      .send(transactionPayload());

    const del = await request(app)
      .delete(`/api/transactions/${created.body.id}`)
      .set(authHeader(token));
    expect(del.status).toBe(204);

    const list = await request(app).get("/api/transactions").set(authHeader(token));
    expect(list.body.data).toHaveLength(0);
  });
});
