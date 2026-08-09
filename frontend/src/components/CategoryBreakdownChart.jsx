import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "../context/ThemeContext.jsx";
import { formatCurrency } from "../utils/currency.js";
import { EXPENSE_COLOR, EXPENSE_COLOR_DARK } from "../utils/transactionColors.js";

// Chart chrome from the dataviz skill's validated palette — dark values are
// that palette's own dark-surface steps, not an automatic flip. MUTED_TEXT
// is unchanged by design: the skill's reference table lists the same hex
// for both modes. OTHER_COLOR reuses the palette's baseline/axis neutral
// (same slot as the gridline/axis color elsewhere in the app).
const GRIDLINE_COLOR = "#e1e0d9";
const GRIDLINE_COLOR_DARK = "#2c2c2a";
const MUTED_TEXT = "#898781";
const OTHER_CATEGORY_LABEL = "Outras";
const OTHER_COLOR = "#c3c2b7";
const OTHER_COLOR_DARK = "#383835";

function CustomTooltip({ active, payload }) {
  const { theme } = useTheme();
  if (!active || !payload?.length) return null;
  const { category, amount } = payload[0].payload;

  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow dark:border-gray-700 dark:bg-gray-800">
      <p className="font-medium text-gray-900 dark:text-gray-100">{category}</p>
      <p style={{ color: theme === "dark" ? EXPENSE_COLOR_DARK : EXPENSE_COLOR }}>
        {formatCurrency(amount)}
      </p>
    </div>
  );
}

export default function CategoryBreakdownChart({ data }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
        Nenhuma despesa este mês.
      </p>
    );
  }

  // Taller for more categories, so bars stay a readable thickness instead of
  // squeezing together as the "Outras" bucket adds a 7th row.
  const height = Math.max(160, data.length * 40);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} stroke={isDark ? GRIDLINE_COLOR_DARK : GRIDLINE_COLOR} />
        <XAxis
          type="number"
          tickFormatter={(value) => new Intl.NumberFormat("pt-BR").format(value)}
          tick={{ fill: MUTED_TEXT, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="category"
          tick={{ fill: MUTED_TEXT, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={100}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}
        />
        <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((entry) => (
            <Cell
              key={entry.category}
              fill={
                entry.category === OTHER_CATEGORY_LABEL
                  ? isDark
                    ? OTHER_COLOR_DARK
                    : OTHER_COLOR
                  : isDark
                    ? EXPENSE_COLOR_DARK
                    : EXPENSE_COLOR
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
