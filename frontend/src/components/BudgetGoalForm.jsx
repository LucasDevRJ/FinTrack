import { useState } from "react";

export default function BudgetGoalForm({ initialValues, onSubmit, onCancel, isSubmitting, error }) {
  const [category, setCategory] = useState(initialValues?.category ?? "");
  const [monthlyLimit, setMonthlyLimit] = useState(initialValues?.monthlyLimit ?? "");

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({ category, monthlyLimit: Number(monthlyLimit) });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="budget-category"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Categoria
          </label>
          <input
            id="budget-category"
            type="text"
            required
            maxLength={50}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        <div>
          <label
            htmlFor="budget-limit"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Limite mensal
          </label>
          <input
            id="budget-limit"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={monthlyLimit}
            onChange={(event) => setMonthlyLimit(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

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
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
