import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "../utils/currency.js";
import { EXPENSE_COLOR } from "../utils/transactionColors.js";

const GRIDLINE_COLOR = "#e1e0d9";
const MUTED_TEXT = "#898781";
const OTHER_CATEGORY_LABEL = "Outras";
const OTHER_COLOR = "#c3c2b7";

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { category, amount } = payload[0].payload;

  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow">
      <p className="font-medium text-gray-900">{category}</p>
      <p style={{ color: EXPENSE_COLOR }}>{formatCurrency(amount)}</p>
    </div>
  );
}

export default function CategoryBreakdownChart({ data }) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-500">
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
        <CartesianGrid horizontal={false} stroke={GRIDLINE_COLOR} />
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
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((entry) => (
            <Cell
              key={entry.category}
              fill={entry.category === OTHER_CATEGORY_LABEL ? OTHER_COLOR : EXPENSE_COLOR}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}