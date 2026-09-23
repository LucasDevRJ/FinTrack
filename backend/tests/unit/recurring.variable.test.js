// Pure-logic unit tests for variable-amount occurrences (#32): which due
// dates are still pending, and the reference estimate shown next to them.
import { describe, expect, it } from "vitest";
import { estimateAmount, pendingDueDates } from "../../src/modules/recurring/recurring.service.js";

function utc(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day));
}

function template(overrides = {}) {
  return {
    startDate: utc(2026, 0, 10),
    dayOfMonth: 10,
    endDate: null,
    lastGeneratedDate: null,
    ...overrides,
  };
}

describe("pendingDueDates", () => {
  it("returns every due date not yet resolved", () => {
    const today = utc(2026, 3, 15);
    const resolved = [utc(2026, 1, 10)];

    expect(pendingDueDates(template(), resolved, today)).toEqual([
      utc(2026, 0, 10),
      utc(2026, 2, 10),
      utc(2026, 3, 10),
    ]);
  });

  it("ignores lastGeneratedDate, which variable templates never use", () => {
    const today = utc(2026, 1, 15);

    expect(pendingDueDates(template({ lastGeneratedDate: utc(2026, 0, 10) }), [], today)).toEqual([
      utc(2026, 0, 10),
      utc(2026, 1, 10),
    ]);
  });

  it("does not include the current month before its due day", () => {
    const today = utc(2026, 1, 9);

    expect(pendingDueDates(template(), [], today)).toEqual([utc(2026, 0, 10)]);
  });

  it("matches resolved dates by instant, whatever their original type", () => {
    const today = utc(2026, 0, 15);

    expect(pendingDueDates(template(), ["2026-01-10T00:00:00.000Z"], today)).toEqual([]);
  });
});

describe("estimateAmount", () => {
  it("is null without any confirmed amount", () => {
    expect(estimateAmount([])).toBeNull();
  });

  it("averages the amounts, rounded to cents", () => {
    expect(estimateAmount([100, 100, 100.01])).toBe(100);
    expect(estimateAmount([10, 20.05])).toBe(15.03);
  });

  it("accepts Prisma Decimal-like values", () => {
    expect(estimateAmount([{ toString: () => "90.5" }, "109.5"])).toBe(100);
  });
});
