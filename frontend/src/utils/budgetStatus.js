// Status palette validated by the dataviz skill (good/warning/critical are
// fixed, never themed) — same three-tier severity a meter's fill is meant
// to carry. Thresholds: under 80% reads as on-track, 80–99% as a warning,
// 100%+ as over budget.
const GOOD = { color: "#0ca30c", label: "Dentro do limite" };
const WARNING = { color: "#fab219", label: "Perto do limite" };
const CRITICAL = { color: "#d03b3b", label: "Limite ultrapassado" };

// Unfilled track — the gridline/hairline neutral, not a step of any status
// hue, since the fill's color itself changes with severity (there's no
// single ramp to stay "on" the way a single-hue meter would). Dark value is
// the dataviz skill's dark-surface gridline step, not an automatic flip.
export const BUDGET_TRACK_COLOR = "#e1e0d9";
export const BUDGET_TRACK_COLOR_DARK = "#2c2c2a";

export function getBudgetStatus(percentage) {
  if (percentage >= 100) return CRITICAL;
  if (percentage >= 80) return WARNING;
  return GOOD;
}
