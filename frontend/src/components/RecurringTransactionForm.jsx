import { useState } from "react";

const TYPE_OPTIONS = [
  { value: "EXPENSE", label: "Despesa" },
  { value: "INCOME", label: "Receita" },
];

function toDateInputValue(isoDate) {
  return isoDate ? isoDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

export default function RecurringTransactionForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}) {
  const [type, setType] = useState(initialValues?.type ?? "EXPENSE");
  const [amount, setAmount] = useState(initialValues?.amount ?? "");
  const [category, setCategory] = useState(initialValues?.category ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [dayOfMonth, setDayOfMonth] = useState(initialValues?.dayOfMonth ?? "");
  const [startDate, setStartDate] = useState(toDateInputValue(initialValues?.startDate));
  const [endDate, setEndDate] = useState(initialValues?.endDate ? initialValues.endDate.slice(0, 10) : "");
  const [active, setActive] = useState(initialValues?.active ?? true);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      type,
      amount: Number(amount),
      category,
      description: description.trim() || undefined,
      dayOfMonth: Number(dayOfMonth),
      startDate,
      endDate: endDate || null,
      ...(initialValues ? { active } : {}),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="recurring-type" className="block text-sm font-medium text-gray-700">
            Tipo
          </label>
          <select
            id="recurring-type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="recurring-amount" className="block text-sm font-medium text-gray-700">
            Valor
          </label>
          <input
            id="recurring-amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="recurring-category" className="block text-sm font-medium text-gray-700">
            Categoria
          </label>
          <input
            id="recurring-category"
            type="text"
            required
            maxLength={50}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="recurring-day" className="block text-sm font-medium text-gray-700">
            Dia do mês
          </label>
          <input
            id="recurring-day"
            type="number"
            min="1"
            max="31"
            required
            value={dayOfMonth}
            onChange={(event) => setDayOfMonth(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">Em meses mais curtos, cai no último dia do mês.</p>
        </div>

        <div>
          <label htmlFor="recurring-start" className="block text-sm font-medium text-gray-700">
            Início
          </label>
          <input
            id="recurring-start"
            type="date"
            required
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="recurring-end" className="block text-sm font-medium text-gray-700">
            Fim (opcional)
          </label>
          <input
            id="recurring-end"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="recurring-description" className="block text-sm font-medium text-gray-700">
            Descrição (opcional)
          </label>
          <input
            id="recurring-description"
            type="text"
            maxLength={500}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {initialValues && (
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="recurring-active"
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="recurring-active" className="text-sm font-medium text-gray-700">
              Ativa (pausar interrompe a geração de novas transações, sem apagar o histórico)
            </label>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
