// Validation edge cases for the recurring-transaction Zod schemas — no DB
// involved, just schema.parse/safeParse. Includes a regression test for the
// endDate bug fixed in commit 5b4384e (optional() without nullable() let a
// null "Fim" input coerce to the Unix epoch instead of failing validation).
import { describe, expect, it } from "vitest";
import {
  createRecurringTransactionSchema,
  updateRecurringTransactionSchema,
} from "../../src/modules/recurring/recurring.schema.js";

function validPayload(overrides = {}) {
  return {
    type: "EXPENSE",
    amount: 150.5,
    category: "Assinaturas",
    dayOfMonth: 10,
    startDate: "2026-01-10",
    ...overrides,
  };
}

describe("createRecurringTransactionSchema", () => {
  it("accepts a valid payload with no endDate at all", () => {
    const result = createRecurringTransactionSchema.safeParse(validPayload());
    expect(result.success).toBe(true);
  });

  it("regression: accepts endDate: null (blank 'Fim' field) instead of coercing to the Unix epoch", () => {
    const result = createRecurringTransactionSchema.safeParse(validPayload({ endDate: null }));

    expect(result.success).toBe(true);
    expect(result.data.endDate).toBeNull();
  });

  it("accepts a valid endDate on/after startDate", () => {
    const result = createRecurringTransactionSchema.safeParse(
      validPayload({ endDate: "2026-06-10" })
    );
    expect(result.success).toBe(true);
  });

  it("rejects an endDate before startDate", () => {
    const result = createRecurringTransactionSchema.safeParse(
      validPayload({ endDate: "2025-01-01" })
    );

    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(["endDate"]);
  });

  it("rejects dayOfMonth outside 1-31", () => {
    expect(createRecurringTransactionSchema.safeParse(validPayload({ dayOfMonth: 0 })).success).toBe(
      false
    );
    expect(createRecurringTransactionSchema.safeParse(validPayload({ dayOfMonth: 32 })).success).toBe(
      false
    );
  });

  it("rejects an invalid type", () => {
    const result = createRecurringTransactionSchema.safeParse(validPayload({ type: "SAVINGS" }));
    expect(result.success).toBe(false);
  });
});

describe("updateRecurringTransactionSchema", () => {
  it("accepts endDate: null on its own (clearing an existing end date)", () => {
    const result = updateRecurringTransactionSchema.safeParse({ endDate: null });
    expect(result.success).toBe(true);
    expect(result.data.endDate).toBeNull();
  });

  it("rejects an empty object (must update at least one field)", () => {
    const result = updateRecurringTransactionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects endDate before an explicitly-provided startDate", () => {
    const result = updateRecurringTransactionSchema.safeParse({
      startDate: "2026-06-01",
      endDate: "2026-01-01",
    });
    expect(result.success).toBe(false);
  });
});
