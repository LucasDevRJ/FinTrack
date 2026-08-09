import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "../context/ThemeContext.jsx";
import { formatCurrency } from "../utils/currency.js";
import {
  EXPENSE_COLOR,
  EXPENSE_COLOR_DARK,
  INCOME_COLOR,
  INCOME_COLOR_DARK,
} from "../utils/transactionColors.js";

// Chart chrome (grid/axis/muted labels) from the dataviz skill's validated
// palette — dark values are that palette's own dark-surface steps, not an
// automatic flip. MUTED_TEXT is unchanged by design: the skill's reference
// table lists the same hex for both modes.
const GRIDLINE_COLOR = "#e1e0d9";
const GRIDLINE_COLOR_DARK = "#2c2c2a";
const AXIS_COLOR = "#c3c2b7";
const AXIS_COLOR_DARK = "#383835";
const MUTED_TEXT = "#898781";

const SERIES_LABELS = { income: "Receitas", expense: "Despesas" };

function monthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" })
    .format(new Date(year, month - 1, 1))
    .replace(".", "");
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-1 font-medium text-gray-900 dark:text-gray-100">{monthLabel(label)}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {SERIES_LABELS[entry.dataKey]}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function MonthlyBarChart({ data }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const hasData = data.some((entry) => entry.income > 0 || entry.expense > 0);

  if (!hasData) {
    return (
      <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
        Nenhuma transação nos últimos 6 meses.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} barGap={2} barCategoryGap="20%">
        <CartesianGrid vertical={false} stroke={isDark ? GRIDLINE_COLOR_DARK : GRIDLINE_COLOR} />
        <XAxis
          dataKey="month"
          tickFormatter={monthLabel}
          tick={{ fill: MUTED_TEXT, fontSize: 12 }}
          axisLine={{ stroke: isDark ? AXIS_COLOR_DARK : AXIS_COLOR }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(value) => new Intl.NumberFormat("pt-BR").format(value)}
          tick={{ fill: MUTED_TEXT, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}
        />
        <Legend
          formatter={(value) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">{SERIES_LABELS[value]}</span>
          )}
          iconType="circle"
          iconSize={8}
        />
        <Bar
          dataKey="income"
          name="income"
          fill={isDark ? INCOME_COLOR_DARK : INCOME_COLOR}
          radius={[4, 4, 0, 0]}
          maxBarSize={20}
        />
        <Bar
          dataKey="expense"
          name="expense"
          fill={isDark ? EXPENSE_COLOR_DARK : EXPENSE_COLOR}
          radius={[4, 4, 0, 0]}
          maxBarSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
