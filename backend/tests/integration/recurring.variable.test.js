// Integration tests for variable-amount recurring templates (#32): they never
// generate transactions on their own; each due month is a pending occurrence
// until the user confirms the real amount (creating the transaction) or
// skips it. Same supertest + real test-DB setup as recurring.routes.test.js.
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { authHeader, createAuthenticatedUser } from "../setup/auth.js";
import { prisma, resetDb } from "../setup/db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

// Day 1 of the month `monthsAgo` back — with dayOfMonth: 1 every month from
// startDate through the current one is already due, whatever today is.
function monthStart(monthsAgo) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1)).toISOString();
}

async function createVariableTemplate(token, { monthsBack = 2, ...overrides } = {}) {
  const res = await request(app)
    .post("/api/recurring")
    .set(authHeader(token))
    .send({
      type: "EXPENSE",
      variableAmount: true,
      amount: null,
      category: "Contas",
      description: "Conta de luz",
      dayOfMonth: 1,
      startDate: monthStart(monthsBack).slice(0, 10),
      ...overrides,
    });
  expect(res.status).toBe(201);
  return res.body;
}

function getPending(token) {
  return request(app).get("/api/recurring/pending").set(authHeader(token));
}

function confirm(token, id, body) {
  return request(app).post(`/api/recurring/${id}/confirm`).set(authHeader(token)).send(body);
}

function skip(token, id, body) {
  return request(app).post(`/api/recurring/${id}/skip`).set(authHeader(token)).send(body);
}

describe("creating a variable-amount template", () => {
  it("stores it without an amount", async () => {
    const { token } = await createAuthenticatedUser();
    const template = await createVariableTemplate(token);

    expect(template.variableAmount).toBe(true);
    expect(template.amount).toBeNull();
  });

  it("rejects an amount on a variable-amount template", async () => {
    const { token } = await createAuthenticatedUser();
    const res = await request(app)
      .post("/api/recurring")
      .set(authHeader(token))
      .send({
        type: "EXPENSE",
        variableAmount: true,
        amount: 90,
        category: "Contas",
        dayOfMonth: 1,
        startDate: monthStart(0).slice(0, 10),
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      { field: "amount", message: "Recorrência de valor variável não tem valor fixo" },
    ]);
  });

  it("still requires an amount on a fixed-amount template", async () => {
    const { token } = await createAuthenticatedUser();
    const res = await request(app)
      .post("/api/recurring")
      .set(authHeader(token))
      .send({
        type: "EXPENSE",
        category: "Moradia",
        dayOfMonth: 1,
        startDate: monthStart(0).slice(0, 10),
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      { field: "amount", message: "Informe o valor da recorrência" },
    ]);
  });
});

describe("GET /api/recurring/pending", () => {
  it("lists every due month, oldest first, and never generates transactions", async () => {
    const { token } = await createAuthenticatedUser();
    const template = await createVariableTemplate(token, { monthsBack: 2 });

    const res = await getPending(token);

    expect(res.status).toBe(200);
    expect(res.body.map((p) => p.dueDate)).toEqual([monthStart(2), monthStart(1), monthStart(0)]);
    expect(res.body[0]).toMatchObject({
      recurringTransactionId: template.id,
      category: "Contas",
      description: "Conta de luz",
      estimatedAmount: null,
    });

    const transactions = await request(app).get("/api/transactions").set(authHeader(token));
    expect(transactions.body.data).toHaveLength(0);
  });

  it("estimates from the average of the 3 most recent confirmations", async () => {
    const { token } = await createAuthenticatedUser();
    const template = await createVariableTemplate(token, { monthsBack: 4 });

    const amounts = [100, 200, 300, 400];
    for (const [index, amount] of amounts.entries()) {
      const res = await confirm(token, template.id, { dueDate: monthStart(4 - index), amount });
      expect(res.status).toBe(201);
    }

    const res = await getPending(token);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].estimatedAmount).toBe(300); // (200 + 300 + 400) / 3, the oldest dropped
  });

  it("does not show another user's pending occurrences", async () => {
    const alice = await createAuthenticatedUser({ email: "alice-variable@example.com" });
    const bob = await createAuthenticatedUser({ email: "bob-variable@example.com" });
    await createVariableTemplate(alice.token);

    const res = await getPending(bob.token);
    expect(res.body).toEqual([]);
  });

  it("rejects an unauthenticated request", async () => {
    const res = await request(app).get("/api/recurring/pending");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/recurring/:id/confirm", () => {
  it("creates the real transaction and resolves that month", async () => {
    const { token } = await createAuthenticatedUser();
    const template = await createVariableTemplate(token, { monthsBack: 1 });

    const res = await confirm(token, template.id, { dueDate: monthStart(1), amount: 97.35 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      type: "EXPENSE",
      amount: 97.35,
      category: "Contas",
      date: monthStart(1),
      recurringTransactionId: template.id,
    });

    const transactions = await request(app).get("/api/transactions").set(authHeader(token));
    expect(transactions.body.data.map((t) => t.amount)).toEqual([97.35]);

    const pending = await getPending(token);
    expect(pending.body.map((p) => p.dueDate)).toEqual([monthStart(0)]);
  });

  it("keeps the month resolved when the payment date differs from the due date", async () => {
    const { token } = await createAuthenticatedUser();
    const template = await createVariableTemplate(token, { monthsBack: 1 });
    const paidOn = new Date(monthStart(1));
    paidOn.setUTCDate(12);

    const res = await confirm(token, template.id, {
      dueDate: monthStart(1),
      amount: 80,
      date: paidOn.toISOString(),
    });

    expect(res.status).toBe(201);
    expect(res.body.date).toBe(paidOn.toISOString());
    const pending = await getPending(token);
    expect(pending.body.map((p) => p.dueDate)).toEqual([monthStart(0)]);
  });

  it("keeps the month resolved after the confirmed transaction is deleted", async () => {
    const { token } = await createAuthenticatedUser();
    const template = await createVariableTemplate(token, { monthsBack: 0 });
    const confirmed = await confirm(token, template.id, { dueDate: monthStart(0), amount: 50 });

    await request(app).delete(`/api/transactions/${confirmed.body.id}`).set(authHeader(token));

    const pending = await getPending(token);
    expect(pending.body).toEqual([]);
  });

  it("rejects confirming the same month twice", async () => {
    const { token } = await createAuthenticatedUser();
    const template = await createVariableTemplate(token, { monthsBack: 0 });
    await confirm(token, template.id, { dueDate: monthStart(0), amount: 50 });

    const res = await confirm(token, template.id, { dueDate: monthStart(0), amount: 60 });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Este vencimento já foi resolvido");
  });

  it("rejects a date that isn't one of the template's due dates", async () => {
    const { token } = await createAuthenticatedUser();
    const template = await createVariableTemplate(token, { monthsBack: 1 });
    const notDue = new Date(monthStart(1));
    notDue.setUTCDate(15);

    const res = await confirm(token, template.id, { dueDate: notDue.toISOString(), amount: 50 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Esta recorrência não tem vencimento nessa data");
  });

  it("rejects confirming on a fixed-amount template", async () => {
    const { token } = await createAuthenticatedUser();
    const fixed = await request(app)
      .post("/api/recurring")
      .set(authHeader(token))
      .send({
        type: "EXPENSE",
        amount: 1400,
        category: "Moradia",
        dayOfMonth: 1,
        startDate: monthStart(0).slice(0, 10),
      });

    const res = await confirm(token, fixed.body.id, { dueDate: monthStart(0), amount: 1400 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Só recorrências de valor variável têm pendências");
  });

  it("returns 404 for another user's template", async () => {
    const alice = await createAuthenticatedUser({ email: "alice-confirm@example.com" });
    const bob = await createAuthenticatedUser({ email: "bob-confirm@example.com" });
    const template = await createVariableTemplate(alice.token, { monthsBack: 0 });

    const res = await confirm(bob.token, template.id, { dueDate: monthStart(0), amount: 50 });

    expect(res.status).toBe(404);
  });

  it("rejects a non-UUID id", async () => {
    const { token } = await createAuthenticatedUser();
    const res = await confirm(token, "not-a-uuid", { dueDate: monthStart(0), amount: 50 });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/recurring/:id/skip", () => {
  it("resolves the month without creating a transaction", async () => {
    const { token } = await createAuthenticatedUser();
    const template = await createVariableTemplate(token, { monthsBack: 1 });

    const res = await skip(token, template.id, { dueDate: monthStart(1) });

    expect(res.status).toBe(204);
    const pending = await getPending(token);
    expect(pending.body.map((p) => p.dueDate)).toEqual([monthStart(0)]);
    const transactions = await request(app).get("/api/transactions").set(authHeader(token));
    expect(transactions.body.data).toHaveLength(0);
  });

  it("returns 404 for another user's template", async () => {
    const alice = await createAuthenticatedUser({ email: "alice-skip@example.com" });
    const bob = await createAuthenticatedUser({ email: "bob-skip@example.com" });
    const template = await createVariableTemplate(alice.token, { monthsBack: 0 });

    const res = await skip(bob.token, template.id, { dueDate: monthStart(0) });

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/recurring/:id on a variable-amount template", () => {
  it("rejects setting a fixed amount", async () => {
    const { token } = await createAuthenticatedUser();
    const template = await createVariableTemplate(token);

    const res = await request(app)
      .patch(`/api/recurring/${template.id}`)
      .set(authHeader(token))
      .send({ amount: 90 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Recorrência de valor variável não tem valor fixo");
  });

  it("rejects changing the amount type", async () => {
    const { token } = await createAuthenticatedUser();
    const template = await createVariableTemplate(token);

    const res = await request(app)
      .patch(`/api/recurring/${template.id}`)
      .set(authHeader(token))
      .send({ variableAmount: false });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      {
        field: "variableAmount",
        message: "O tipo de valor não pode ser alterado; crie outra recorrência",
      },
    ]);
  });
});
