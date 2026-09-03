// Pure-logic unit tests for dueOccurrencesForTemplate — no DB, no mocking.
// This is the core of the lazy-generation feature: given a template and
// "today", which occurrence dates are actually due? Covers the scenarios
// called out in issue #2 (lazy materialization, idempotency-adjacent
// month-resuming, day-of-month clamping for short months).
import { describe, expect, it } from "vitest";
import { dueOccurrencesForTemplate } from "../../src/modules/recurring/recurring.service.js";

function utc(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day));
}

function template(overrides = {}) {
  return {
    startDate: utc(2026, 0, 5), // Jan 5, 2026
    dayOfMonth: 5,
    endDate: null,
    lastGeneratedDate: null,
    ...overrides,
  };
}

describe("dueOccurrencesForTemplate", () => {
  it("generates one occurrence per elapsed month from startDate up to today", () => {
    const today = utc(2026, 3, 10); // Apr 10, 2026
    const occurrences = dueOccurrencesForTemplate(template(), today);

    expect(occurrences).toEqual([
      utc(2026, 0, 5),
      utc(2026, 1, 5),
      utc(2026, 2, 5),
      utc(2026, 3, 5),
    ]);
  });

  it("resumes the month after lastGeneratedDate instead of regenerating it", () => {
    const today = utc(2026, 3, 10);
    const occurrences = dueOccurrencesForTemplate(
      template({ lastGeneratedDate: utc(2026, 1, 5) }),
      today
    );

    // Idempotency: Jan and Feb are already accounted for, only Mar/Apr are new.
    expect(occurrences).toEqual([utc(2026, 2, 5), utc(2026, 3, 5)]);
  });

  it("returns nothing once fully caught up (repeat call is a no-op)", () => {
    const today = utc(2026, 3, 10);
    const occurrences = dueOccurrencesForTemplate(
      template({ lastGeneratedDate: utc(2026, 3, 5) }),
      today
    );

    expect(occurrences).toEqual([]);
  });

  it("does not generate an occurrence for the current month before its day arrives", () => {
    const today = utc(2026, 3, 3); // Apr 3 — before dayOfMonth 5
    const occurrences = dueOccurrencesForTemplate(template(), today);

    expect(occurrences.at(-1)).toEqual(utc(2026, 2, 5)); // stops at March
    expect(occurrences).not.toContainEqual(utc(2026, 3, 5));
  });

  it("clamps dayOfMonth to the last day of a shorter month (31 -> Feb 28)", () => {
    const today = utc(2026, 1, 28); // Feb 28, 2026 (not a leap year)
    const occurrences = dueOccurrencesForTemplate(
      template({ startDate: utc(2026, 0, 31), dayOfMonth: 31 }),
      today
    );

    expect(occurrences).toEqual([utc(2026, 0, 31), utc(2026, 1, 28)]);
  });

  it("clamps to Feb 29 on a leap year", () => {
    const today = utc(2028, 1, 29); // 2028 is a leap year
    const occurrences = dueOccurrencesForTemplate(
      template({ startDate: utc(2028, 0, 31), dayOfMonth: 31 }),
      today
    );

    expect(occurrences.at(-1)).toEqual(utc(2028, 1, 29));
  });

  it("never backdates an occurrence before the template's own startDate", () => {
    // startDate mid-month, dayOfMonth earlier than that same day — the
    // start month itself shouldn't produce a backdated occurrence.
    const today = utc(2026, 2, 1);
    const occurrences = dueOccurrencesForTemplate(
      template({ startDate: utc(2026, 0, 15), dayOfMonth: 5 }),
      today
    );

    expect(occurrences).toEqual([utc(2026, 1, 5)]); // Jan skipped, Feb included
  });

  it("stops generating once past an optional endDate", () => {
    const today = utc(2026, 5, 10); // June
    const occurrences = dueOccurrencesForTemplate(
      template({ endDate: utc(2026, 1, 28) }), // last day of Feb — March's
      // 1st-of-month cursor falls after it, so March is excluded
      today
    );

    expect(occurrences).toEqual([utc(2026, 0, 5), utc(2026, 1, 5)]);
  });
});
