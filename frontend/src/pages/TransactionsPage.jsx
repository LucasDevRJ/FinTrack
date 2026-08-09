import { useEffect, useState } from "react";
import {
  createTransactionRequest,
  deleteTransactionRequest,
  exportTransactionsRequest,
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

const EMPTY_FILTERS = { startDate: "", endDate: "", category: "", q: "" };

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  function loadTransactions(activeFilters, activePage) {
    return listTransactionsRequest({ ...activeFilters, page: activePage })
      .then(({ data, pagination: meta }) => {
        setTransactions(data);
        setPagination(meta);
      })
      .catch(() => setLoadError("Não foi possível carregar as transações"));
  }

  useEffect(() => {
    loadTransactions(appliedFilters, page);
  }, [appliedFilters, page]);

  function handleFilterSubmit(event) {
    event.preventDefault();
    setAppliedFilters(filters);
    setPage(1);
  }

  function handleClearFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  }

  async function handleExport() {
    setIsExporting(true);
    setExportError("");
    try {
      // Exports the currently applied filters, not the unsubmitted draft in
      // the form inputs — same source of truth the visible table uses.
      await exportTransactionsRequest(appliedFilters);
    } catch {
      setExportError("Não foi possível exportar o CSV");
    } finally {
      setIsExporting(false);
    }
  }

  const hasActiveFilters = Boolean(
    appliedFilters.startDate || appliedFilters.endDate || appliedFilters.category || appliedFilters.q
  );

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
        await updateTransactionRequest(editingTransaction.id, values);
      } else {
        await createTransactionRequest(values);
      }
      await loadTransactions(appliedFilters, page);
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
      // Deleting the last row on a page beyond the first would otherwise
      // leave the user staring at an empty page — step back one page in
      // that case instead of reloading the now-empty one.
      const isLastRowOnPage = transactions?.length === 1 && page > 1;
      const targetPage = isLastRowOnPage ? page - 1 : page;
      if (isLastRowOnPage) setPage(targetPage);
      else await loadTransactions(appliedFilters, targetPage);
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
            <div className="flex gap-3">
              <button
                onClick={handleExport}
                disabled={isExporting || !transactions?.length}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isExporting ? "Exportando..." : "Exportar CSV"}
              </button>
              <button
                onClick={openCreateForm}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Nova transação
              </button>
            </div>
          )}
        </div>
        {exportError && <p className="mb-4 text-sm text-red-600">{exportError}</p>}

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

        <form
          onSubmit={handleFilterSubmit}
          className="mb-6 flex flex-wrap items-end gap-4 rounded-lg bg-white p-5 shadow"
        >
          <div>
            <label htmlFor="filter-start-date" className="block text-sm font-medium text-gray-700">
              De
            </label>
            <input
              id="filter-start-date"
              type="date"
              value={filters.startDate}
              onChange={(event) => setFilters((f) => ({ ...f, startDate: event.target.value }))}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="filter-end-date" className="block text-sm font-medium text-gray-700">
              Até
            </label>
            <input
              id="filter-end-date"
              type="date"
              value={filters.endDate}
              onChange={(event) => setFilters((f) => ({ ...f, endDate: event.target.value }))}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="filter-category" className="block text-sm font-medium text-gray-700">
              Categoria
            </label>
            <input
              id="filter-category"
              type="text"
              value={filters.category}
              onChange={(event) => setFilters((f) => ({ ...f, category: event.target.value }))}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="filter-q" className="block text-sm font-medium text-gray-700">
              Buscar
            </label>
            <input
              id="filter-q"
              type="text"
              placeholder="Descrição ou categoria"
              value={filters.q}
              onChange={(event) => setFilters((f) => ({ ...f, q: event.target.value }))}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Filtrar
          </button>
          <button
            type="button"
            onClick={handleClearFilters}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Limpar
          </button>
        </form>

        {loadError && <p className="text-sm text-red-600">{loadError}</p>}
        {!isFormOpen && actionError && <p className="mb-4 text-sm text-red-600">{actionError}</p>}

        {!loadError && !transactions && <p className="text-gray-500">Carregando...</p>}

        {transactions && transactions.length === 0 && (
          <p className="text-gray-500">
            {hasActiveFilters
              ? "Nenhuma transação encontrada para os filtros selecionados."
              : "Nenhuma transação cadastrada ainda."}
          </p>
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
                    <td className="px-4 py-3 text-gray-700">
                      {transaction.category}
                      {transaction.recurringTransactionId && (
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          Recorrente
                        </span>
                      )}
                    </td>
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

        {pagination && pagination.total > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <p>
              {pagination.total} transaç{pagination.total === 1 ? "ão" : "ões"} · página{" "}
              {pagination.page} de {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={pagination.page <= 1}
                className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="rounded-md border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}