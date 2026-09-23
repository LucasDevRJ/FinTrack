import { useState } from "react";
import { formatCurrency } from "../utils/currency.js";
import { formatDate, toDateInputValue } from "../utils/date.js";

const inputClassName =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100";

export default function PendingOccurrenceCard({ occurrence, onConfirm, onSkip, isSubmitting }) {
  // The estimate only pre-fills the field; nothing is recorded until the user
  // submits the real amount (#32).
  const [amount, setAmount] = useState(occurrence.estimatedAmount ?? "");
  const [date, setDate] = useState(toDateInputValue(occurrence.dueDate));
  const [isConfirmingSkip, setIsConfirmingSkip] = useState(false);

  const idPrefix = `pending-${occurrence.recurringTransactionId}-${occurrence.dueDate.slice(0, 10)}`;
  const dueLabel = formatDate(occurrence.dueDate);

  function handleSubmit(event) {
    event.preventDefault();
    onConfirm({ dueDate: occurrence.dueDate, amount: Number(amount), date });
  }

  return (
    <section
      aria-label={`${occurrence.category} — vencimento ${dueLabel}`}
      className="rounded-lg border border-amber-300 bg-white p-5 shadow dark:border-amber-700 dark:bg-gray-800"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100">{occurrence.category}</h3>
          {occurrence.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{occurrence.description}</p>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Vencimento {dueLabel}
          {occurrence.estimatedAmount !== null && (
            <> · estimado {formatCurrency(occurrence.estimatedAmount)}</>
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${idPrefix}-amount`}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Valor da conta
            </label>
            <input
              id={`${idPrefix}-amount`}
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label
              htmlFor={`${idPrefix}-date`}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Data do pagamento
            </label>
            <input
              id={`${idPrefix}-date`}
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={`${inputClassName} dark:[color-scheme:dark]`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Confirmar valor
          </button>
          {isConfirmingSkip ? (
            <span className="space-x-3">
              <button
                type="button"
                onClick={() => onSkip({ dueDate: occurrence.dueDate })}
                disabled={isSubmitting}
                className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
              >
                Confirmar pulo
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingSkip(false)}
                className="text-sm text-gray-500 hover:underline dark:text-gray-400"
              >
                Cancelar
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingSkip(true)}
              className="text-sm text-gray-500 hover:underline dark:text-gray-400"
            >
              Pular este mês
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
