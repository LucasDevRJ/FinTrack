// Unit tests for moneyAmountSchema, shared by every money field (transactions,
// budgets, recurring, CSV import). The sweep exists because the old
// `Number.isInteger(value * 100)` check broke on floating point for ~9% of
// valid amounts (77.9 * 100 === 7790.000000000001) and no hand-picked
// "round" example had caught it (#97).
import { describe, expect, it } from "vitest";
import { moneyAmountSchema } from "../../src/utils/validators.js";

describe("moneyAmountSchema", () => {
  it("accepts every amount with up to 2 decimal places from 0.01 to 1000.00", () => {
    const rejected = [];
    for (let cents = 1; cents <= 100_000; cents++) {
      const amount = cents / 100;
      if (!moneyAmountSchema.safeParse(amount).success) rejected.push(amount);
    }

    expect(rejected).toEqual([]);
  });

  it("accepts the amounts that exposed the bug", () => {
    for (const amount of [77.9, 19.99, 1.1, 0.29, 0.07]) {
      expect(moneyAmountSchema.safeParse(amount).success).toBe(true);
    }
  });

  it("still rejects more than 2 decimal places", () => {
    for (const amount of [1.005, 77.901, 0.001]) {
      const result = moneyAmountSchema.safeParse(amount);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe("Valor deve ter no máximo 2 casas decimais");
    }
  });
});
