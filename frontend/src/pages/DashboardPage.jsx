import { useEffect, useState } from "react";
import { getSummaryRequest } from "../api/transactions.js";
import Header from "../components/Header.jsx";
import MonthlyBarChart from "../components/MonthlyBarChart.jsx";
import { formatCurrency } from "../utils/currency.js";

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(value)}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getSummaryRequest()
      .then(setSummary)
      .catch(() => setError("Não foi possível carregar o resumo financeiro"));
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <Header />

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!error && !summary && <p className="text-gray-500">Carregando...</p>}

        {summary && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SummaryCard label="Saldo atual" value={summary.balance} />
              <SummaryCard label="Receitas do mês" value={summary.currentMonth.income} />
              <SummaryCard label="Despesas do mês" value={summary.currentMonth.expense} />
            </div>

            <div className="rounded-lg bg-white p-5 shadow">
              <h2 className="mb-4 text-sm font-medium text-gray-700">
                Receitas x despesas (últimos 6 meses)
              </h2>
              <MonthlyBarChart data={summary.monthlyBreakdown} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}