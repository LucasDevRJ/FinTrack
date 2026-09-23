import { useEffect, useState } from "react";
import {
  confirmOccurrenceRequest,
  createRecurringTransactionRequest,
  deleteRecurringTransactionRequest,
  listPendingOccurrencesRequest,
  listRecurringTransactionsRequest,
  skipOccurrenceRequest,
  updateRecurringTransactionRequest,
} from "../api/recurring.js";
import Header from "../components/Header.jsx";
import PendingOccurrenceCard from "../components/PendingOccurrenceCard.jsx";
import RecurringTransactionForm from "../components/RecurringTransactionForm.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { formatCurrency } from "../utils/currency.js";
import { getErrorMessage } from "../utils/apiError.js";
import { formatDate } from "../utils/date.js";
import {
  EXPENSE_COLOR,
  EXPENSE_COLOR_DARK,
  INCOME_COLOR,
  INCOME_COLOR_DARK,
} from "../utils/transactionColors.js";

export default function RecurringPage() {
  const { theme } = useTheme();
  const [templates, setTemplates] = useState(null);
  const [pendingOccurrences, setPendingOccurrences] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  function loadTemplates() {
    return Promise.all([listRecurringTransactionsRequest(), listPendingOccurrencesRequest()])
      .then(([loadedTemplates, loadedPending]) => {
        setTemplates(loadedTemplates);
        setPendingOccurrences(loadedPending);
      })
      .catch(() => setLoadError("Não foi possível carregar as transações recorrentes"));
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  function openCreateForm() {
    setEditingTemplate(null);
    setActionError("");
    setIsFormOpen(true);
  }

  function openEditForm(template) {
    setEditingTemplate(template);
    setActionError("");
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingTemplate(null);
  }

  async function handleSubmit(values) {
    setIsSubmitting(true);
    setActionError("");
    try {
      if (editingTemplate) {
        await updateRecurringTransactionRequest(editingTemplate.id, values);
      } else {
        await createRecurringTransactionRequest(values);
      }
      await loadTemplates();
      closeForm();
    } catch (err) {
      setActionError(getErrorMessage(err, "Não foi possível salvar a transação recorrente"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResolveOccurrence(occurrence, request, values, fallbackMessage) {
    setIsSubmitting(true);
    setActionError("");
    try {
      await request(occurrence.recurringTransactionId, values);
      await loadTemplates();
    } catch (err) {
      setActionError(getErrorMessage(err, fallbackMessage));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id) {
    setActionError("");
    try {
      await deleteRecurringTransactionRequest(id);
      await loadTemplates();
    } catch {
      setActionError("Não foi possível excluir a transação recorrente");
    } finally {
      setConfirmingDeleteId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl">
        <Header />

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Transações recorrentes
          </h2>
          {!isFormOpen && (
            <button
              onClick={openCreateForm}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Nova recorrência
            </button>
          )}
        </div>

        {isFormOpen && (
          <div className="mb-6 rounded-lg bg-white p-5 shadow dark:bg-gray-800">
            <RecurringTransactionForm
              initialValues={editingTemplate}
              onSubmit={handleSubmit}
              onCancel={closeForm}
              isSubmitting={isSubmitting}
              error={actionError}
            />
          </div>
        )}

        {loadError && <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>}
        {!isFormOpen && actionError && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">{actionError}</p>
        )}

        {pendingOccurrences.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Contas a confirmar
            </h3>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Contas de valor variável só entram no saldo e nas metas depois que você informa o
              valor real.
            </p>
            <div className="space-y-4">
              {pendingOccurrences.map((occurrence) => (
                <PendingOccurrenceCard
                  key={`${occurrence.recurringTransactionId}-${occurrence.dueDate}`}
                  occurrence={occurrence}
                  isSubmitting={isSubmitting}
                  onConfirm={(values) =>
                    handleResolveOccurrence(
                      occurrence,
                      confirmOccurrenceRequest,
                      values,
                      "Não foi possível confirmar o valor"
                    )
                  }
                  onSkip={(values) =>
                    handleResolveOccurrence(
                      occurrence,
                      skipOccurrenceRequest,
                      values,
                      "Não foi possível pular este mês"
                    )
                  }
                />
              ))}
            </div>
          </div>
        )}

        {!loadError && !templates && (
          <p className="text-gray-500 dark:text-gray-400">Carregando...</p>
        )}

        {templates && templates.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">
            Nenhuma recorrência cadastrada ainda. Cadastre aluguel, assinaturas ou salário para
            gerar a transação automaticamente todo mês, ou contas de valor variável (água, luz) para
            confirmar o valor real a cada mês.
          </p>
        )}

        {templates && templates.length > 0 && (
          <div className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="rounded-lg bg-white p-5 shadow dark:bg-gray-800">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {template.category}
                      </h3>
                      {!template.active && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                          Pausada
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {template.description}
                      </p>
                    )}
                  </div>

                  {confirmingDeleteId === template.id ? (
                    <span className="space-x-3">
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(null)}
                        className="text-sm text-gray-500 hover:underline dark:text-gray-400"
                      >
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <span className="space-x-3">
                      <button
                        onClick={() => openEditForm(template)}
                        className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(template.id)}
                        className="text-sm text-red-600 hover:underline dark:text-red-400"
                      >
                        Excluir
                      </button>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Todo dia {template.dayOfMonth} · desde {formatDate(template.startDate)}
                    {template.endDate && <> · até {formatDate(template.endDate)}</>}
                  </p>
                  {template.variableAmount ? (
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Valor variável
                    </p>
                  ) : (
                    <p
                      className="font-medium"
                      style={{
                        color:
                          template.type === "INCOME"
                            ? theme === "dark"
                              ? INCOME_COLOR_DARK
                              : INCOME_COLOR
                            : theme === "dark"
                              ? EXPENSE_COLOR_DARK
                              : EXPENSE_COLOR,
                      }}
                    >
                      {template.type === "INCOME" ? "+ " : "- "}
                      {formatCurrency(template.amount)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
