// Pure-math unit tests for calculateGoalProgress — the percentage/remaining
// calc behind each budget goal's green/yellow/red state (thresholds live in
// the frontend's budgetStatus.js, out of scope for this backend suite; here
// we only cover the numbers it's fed).
import { describe, expect, it } from "vitest";
import { calculateGoalProgress } from "../../src/modules/budgets/budgets.service.js";

describe("calculateGoalProgress", () => {
  it("computes remaining and percentage when under the limit", () => {
    expect(calculateGoalProgress(700, 615)).toEqual({
      spent: 615,
      remaining: 85,
      percentage: (615 / 700) * 100,
    });
  });

  it("goes negative on remaining and above 100% when over the limit", () => {
    const result = calculateGoalProgress(200, 240);
    expect(result.remaining).toBe(-40);
    expect(result.percentage).toBe(120);
  });

  it("is 0% with the full limit remaining when nothing has been spent yet", () => {
    expect(calculateGoalProgress(500, 0)).toEqual({ spent: 0, remaining: 500, percentage: 0 });
  });

  it("is exactly 100% when spend equals the limit", () => {
    expect(calculateGoalProgress(300, 300).percentage).toBe(100);
  });

  it("guards against divide-by-zero for a non-positive limit", () => {
    // Shouldn't happen in practice (moneyAmountSchema enforces > 0 at
    // creation) but the calc shouldn't produce Infinity/NaN either way.
    expect(calculateGoalProgress(0, 50)).toEqual({ spent: 50, remaining: -50, percentage: 0 });
  });
});
