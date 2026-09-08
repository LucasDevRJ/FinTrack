// Integration tests for POST /api/transactions/import — real Express app +
// real test-DB Prisma client via supertest, mirroring
// transactions.routes.test.js's style. Focuses on the behavior that's
// specific to import: partial success (valid rows land, invalid ones are
// reported by line, nothing is all-or-nothing), auth-gating, and that rows
// are scoped to the uploading user like every other transaction write.
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { toCsv } from "../../src/utils/csv.js";
import { authHeader, createAuthenticatedUser } from "../setup/auth.js";
import { prisma, resetDb } from "../setup/db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const HEADERS = ["Data", "Tipo", "Categoria", "Descrição", "Valor"];

describe("POST /api/transactions/import", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await request(app)
      .post("/api/transactions/import")
      .send({ csv: toCsv(HEADERS, [["2026-08-15", "Despesa", "Mercado", "", "10,00"]]) });
    expect(res.status).toBe(401);
  });

  it("imports valid rows and reports invalid ones by line number, without failing the whole file", async () => {
    const { token, user } = await createAuthenticatedUser();

    const csv = toCsv(HEADERS, [
      ["2026-08-15", "Despesa", "Mercado", "Supermercado", "150,50"],
      ["2026-08-16", "Receita", "Salário", "", "not-a-number"],
      ["not-a-date", "Despesa", "Lazer", "", "20,00"],
      ["2026-08-17", "Receita", "Freela", "Projeto X", "1.234,00"],
    ]);

    const res = await request(app)
      .post("/api/transactions/import")
      .set(authHeader(token))
      .send({ csv });

    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(2);
    expect(res.body.failed).toBe(2);
    expect(res.body.errors).toEqual([
      expect.objectContaining({ line: 3 }),
      expect.objectContaining({ line: 4 }),
    ]);

    const stored = await prisma.transaction.findMany({ where: { userId: user.id } });
    expect(stored).toHaveLength(2);
    expect(stored.map((t) => Number(t.amount)).sort((a, b) => a - b)).toEqual([150.5, 1234]);
  });

  it("scopes imported rows to the uploading user", async () => {
    const alice = await createAuthenticatedUser({ email: "alice-import@example.com" });
    const bob = await createAuthenticatedUser({ email: "bob-import@example.com" });

    const csv = toCsv(HEADERS, [["2026-08-15", "Despesa", "Mercado", "", "10,00"]]);
    await request(app).post("/api/transactions/import").set(authHeader(alice.token)).send({ csv });

    const bobTransactions = await prisma.transaction.findMany({ where: { userId: bob.user.id } });
    expect(bobTransactions).toHaveLength(0);
  });

  it("imports a comma-delimited CSV with dd/mm/yyyy dates (spreadsheet-exported, not our own format)", async () => {
    // Regression case: a real file Lucas built in Google Sheets and
    // downloaded as CSV — comma-delimited (not our own export's ";") and
    // Brazilian-format dates, which naive `new Date(...)` parsing would
    // silently misread as month/day instead of day/month.
    const { token } = await createAuthenticatedUser();
    const csv = "Data,Tipo,Categoria,Descrição,Valor\r\n07/09/2026,Despesa,Restaurante,,39.9\r\n";

    const res = await request(app)
      .post("/api/transactions/import")
      .set(authHeader(token))
      .send({ csv });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ imported: 1, failed: 0, errors: [] });

    // Only one transaction exists at this point (resetDb runs beforeEach) —
    // asserting on it directly confirms the date wasn't misread as
    // month/day (which would store July 9th instead of September 7th).
    const [stored] = await prisma.transaction.findMany();
    expect(stored.date.toISOString().slice(0, 10)).toBe("2026-09-07");
    expect(Number(stored.amount)).toBe(39.9);
  });

  it("rejects an empty CSV body", async () => {
    const { token } = await createAuthenticatedUser();
    const res = await request(app)
      .post("/api/transactions/import")
      .set(authHeader(token))
      .send({ csv: "" });
    expect(res.status).toBe(400);
  });
});
