import { useTheme } from "../context/ThemeContext.jsx";
import { formatCurrency } from "../utils/currency.js";
import { BUDGET_TRACK_COLOR, BUDGET_TRACK_COLOR_DARK, getBudgetStatus } from "../utils/budgetStatus.js";

// The fill is visually capped at 100% width so an over-budget goal doesn't
// overflow the track — the actual percentage (which can exceed 100) is
// still shown as text, so "over limit" stays legible instead of just
// looking like a full bar.
export default function BudgetProgressBar({ monthlyLimit, spent, remaining, percentage }) {
  const { theme } = useTheme();
  const status = getBudgetStatus(percentage);
  const fillWidth = Math.min(percentage, 100);
  const trackColor = theme === "dark" ? BUDGET_TRACK_COLOR_DARK : BUDGET_TRACK_COLOR;

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>
          {formatCurrency(spent)} de {formatCurrency(monthlyLimit)}
        </span>
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {Math.round(percentage)}%
        </span>
      </div>

      <div className="mt-1.5 h-2.5 w-full rounded-full" style={{ backgroundColor: trackColor }}>
        <div
          className="h-2.5 rounded-full transition-all"
          style={{ width: `${fillWidth}%`, backgroundColor: status.color }}
        />
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 text-sm">
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: status.color }}
        />
        <span className="text-gray-600 dark:text-gray-400">{status.label}</span>
        {remaining < 0 ? (
          <span className="text-gray-500 dark:text-gray-400">
            — excedido em {formatCurrency(-remaining)}
          </span>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">
            — restam {formatCurrency(remaining)}
          </span>
        )}
      </div>
    </div>
  );
}
