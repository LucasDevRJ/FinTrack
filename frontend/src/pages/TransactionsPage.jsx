import { useEffect, useState } from "react";
import {
  createTransactionRequest,
  deleteTransactionRequest,
  listTransactionsRequest,
  updateTransactionRequest,
} from "../api/transactions.js";
import Header from "../components/Header.jsx";
import TransactionForm from "../components/TransactionForm.jsx";
import { formatCurrency } from "../utils/currency.js";
import { EXPENSE_COLOR, INCOME_COLOR } from "../utils/transactionColors.js";

function formatDate(isoDate) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(isoDate));
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  useEffect(() => {
    listTransactionsRequest()
      .then(setTransactions)
      .catch(() => setLoadError("Não foi possível carregar as transações"));
  }, []);

  function openCreateForm() {
    setEditingTransaction(null);
    setActionError("");
    setIsFormOpen(true);
  }

  function openEditForm(transaction) {
    setEditingTransaction(transaction);
    setActionError("");
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingTransaction(null);
  }

  async function handleSubmit(values) {
    setIsSubmitting(true);
    setActionError("");
    try {
      if (editingTransaction) {
        const updated = await updateTransactionRequest(editingTransaction.id, values);
        setTransactions((current) => current.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await createTransactionRequest(values);
        setTransactions((current) => [created, ...current]);
      }
      closeForm();
    } catch (err) {
      setActionError(err.response?.data?.message ?? "Não foi possível salvar a transação");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id) {
    setActionError("");
    try {
      await deleteTransactionRequest(id);
      setTransactions((current) => current.filter((t) => t.id !== id));
    } catch {
      setActionError("Não foi possível excluir a transação");
    } finally {
      setConfirmingDeleteId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <Header />

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Transações</h2>
          {!isFormOpen && (
            <button
              onClick={openCreateForm}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Nova transação
            </button>
          )}
        </div>

        {isFormOpen && (
          <div className="mb-6 rounded-lg bg-white p-5 shadow">
            <TransactionForm
              initialValues={editingTransaction}
              onSubmit={handleSubmit}
              onCancel={closeForm}
              isSubmitting={isSubmitting}
              error={actionError}
            />
          </div>
        )}

        {loadError && <p className="text-sm text-red-600">{loadError}</p>}
        {!isFormOpen && actionError && <p className="mb-4 text-sm text-red-600">{actionError}</p>}

        {!loadError && !transactions && <p className="text-gray-500">Carregando...</p>}

        {transactions && transactions.length === 0 && (
          <p className="text-gray-500">Nenhuma transação cadastrada ainda.</p>
        )}

        {transactions && transactions.length > 0 && (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 text-right font-medium">Valor</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 text-gray-700">{formatDate(transaction.date)}</td>
                    <td className="px-4 py-3 text-gray-700">{transaction.category}</td>
                    <td className="px-4 py-3 text-gray-500">{transaction.description || "—"}</td>
                    <td
                      className="px-4 py-3 text-right font-medium"
                      style={{ color: transaction.type === "INCOME" ? INCOME_COLOR : EXPENSE_COLOR }}
                    >
                      {transaction.type === "INCOME" ? "+ " : "- "}
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {confirmingDeleteId === transaction.id ? (
                        <span className="space-x-3">
                          <button
                            onClick={() => handleDelete(transaction.id)}
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
                            onClick={() => openEditForm(transaction)}
                            className="text-sm text-indigo-600 hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setConfirmingDeleteId(transaction.id)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Excluir
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}