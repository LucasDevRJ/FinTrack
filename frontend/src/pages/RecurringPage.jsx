import { useEffect, useState } from "react";
import {
  createRecurringTransactionRequest,
  deleteRecurringTransactionRequest,
  listRecurringTransactionsRequest,
  updateRecurringTransactionRequest,
} from "../api/recurring.js";
import Header from "../components/Header.jsx";
import RecurringTransactionForm from "../components/RecurringTransactionForm.jsx";
import { formatCurrency } from "../utils/currency.js";
import { EXPENSE_COLOR, INCOME_COLOR } from "../utils/transactionColors.js";

function formatDate(isoDate) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(isoDate));
}

export default function RecurringPage() {
  const [templates, setTemplates] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  function loadTemplates() {
    return listRecurringTransactionsRequest()
      .then(setTemplates)
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
      setActionError(err.response?.data?.message ?? "Não foi possível salvar a transação recorrente");
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
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <Header />

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Transações recorrentes</h2>
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
          <div className="mb-6 rounded-lg bg-white p-5 shadow">
            <RecurringTransactionForm
              initialValues={editingTemplate}
              onSubmit={handleSubmit}
              onCancel={closeForm}
              isSubmitting={isSubmitting}
              error={actionError}
            />
          </div>
        )}

        {loadError && <p className="text-sm text-red-600">{loadError}</p>}
        {!isFormOpen && actionError && <p className="mb-4 text-sm text-red-600">{actionError}</p>}

        {!loadError && !templates && <p className="text-gray-500">Carregando...</p>}

        {templates && templates.length === 0 && (
          <p className="text-gray-500">
            Nenhuma recorrência cadastrada ainda. Cadastre aluguel, assinaturas ou salário para
            gerar a transação automaticamente todo mês, sem precisar recriar o lançamento.
          </p>
        )}

        {templates && templates.length > 0 && (
          <div className="space-y-4">
            {templates.map((template) => (
              <div key={template.id} className="rounded-lg bg-white p-5 shadow">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{template.category}</h3>
                      {!template.active && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          Pausada
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-500">{template.description}</p>
                    )}
                  </div>

                  {confirmingDeleteId === template.id ? (
                    <span className="space-x-3">
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="text-sm font-medium text-red-600 hover:underline"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(null)}
                        className="text-sm text-gray-500 hover:underline"
                      >
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <span className="space-x-3">
                      <button
                        onClick={() => openEditForm(template)}
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(template.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Excluir
                      </button>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-gray-500">
                    Todo dia {template.dayOfMonth} · desde {formatDate(template.startDate)}
                    {template.endDate && <> · até {formatDate(template.endDate)}</>}
                  </p>
                  <p
                    className="font-medium"
                    style={{ color: template.type === "INCOME" ? INCOME_COLOR : EXPENSE_COLOR }}
                  >
                    {template.type === "INCOME" ? "+ " : "- "}
                    {formatCurrency(template.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
