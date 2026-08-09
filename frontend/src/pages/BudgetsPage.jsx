import { useEffect, useState } from "react";
import {
  createBudgetGoalRequest,
  deleteBudgetGoalRequest,
  listBudgetGoalsRequest,
  updateBudgetGoalRequest,
} from "../api/budgets.js";
import BudgetGoalForm from "../components/BudgetGoalForm.jsx";
import BudgetProgressBar from "../components/BudgetProgressBar.jsx";
import Header from "../components/Header.jsx";

export default function BudgetsPage() {
  const [goals, setGoals] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [editingGoal, setEditingGoal] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  function loadGoals() {
    return listBudgetGoalsRequest()
      .then(setGoals)
      .catch(() => setLoadError("Não foi possível carregar as metas de orçamento"));
  }

  useEffect(() => {
    loadGoals();
  }, []);

  function openCreateForm() {
    setEditingGoal(null);
    setActionError("");
    setIsFormOpen(true);
  }

  function openEditForm(goal) {
    setEditingGoal(goal);
    setActionError("");
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingGoal(null);
  }

  async function handleSubmit(values) {
    setIsSubmitting(true);
    setActionError("");
    try {
      if (editingGoal) {
        await updateBudgetGoalRequest(editingGoal.id, values);
      } else {
        await createBudgetGoalRequest(values);
      }
      await loadGoals();
      closeForm();
    } catch (err) {
      setActionError(err.response?.data?.message ?? "Não foi possível salvar a meta");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id) {
    setActionError("");
    try {
      await deleteBudgetGoalRequest(id);
      await loadGoals();
    } catch {
      setActionError("Não foi possível excluir a meta");
    } finally {
      setConfirmingDeleteId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <Header />

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Metas de orçamento</h2>
          {!isFormOpen && (
            <button
              onClick={openCreateForm}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Nova meta
            </button>
          )}
        </div>

        {isFormOpen && (
          <div className="mb-6 rounded-lg bg-white p-5 shadow">
            <BudgetGoalForm
              initialValues={editingGoal}
              onSubmit={handleSubmit}
              onCancel={closeForm}
              isSubmitting={isSubmitting}
              error={actionError}
            />
          </div>
        )}

        {loadError && <p className="text-sm text-red-600">{loadError}</p>}
        {!isFormOpen && actionError && <p className="mb-4 text-sm text-red-600">{actionError}</p>}

        {!loadError && !goals && <p className="text-gray-500">Carregando...</p>}

        {goals && goals.length === 0 && (
          <p className="text-gray-500">
            Nenhuma meta cadastrada ainda. Defina um limite mensal por categoria para
            acompanhar seus gastos.
          </p>
        )}

        {goals && goals.length > 0 && (
          <div className="space-y-4">
            {goals.map((goal) => (
              <div key={goal.id} className="rounded-lg bg-white p-5 shadow">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">{goal.category}</h3>
                  {confirmingDeleteId === goal.id ? (
                    <span className="space-x-3">
                      <button
                        onClick={() => handleDelete(goal.id)}
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
                        onClick={() => openEditForm(goal)}
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(goal.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Excluir
                      </button>
                    </span>
                  )}
                </div>

                <BudgetProgressBar
                  monthlyLimit={goal.monthlyLimit}
                  spent={goal.spent}
                  remaining={goal.remaining}
                  percentage={goal.percentage}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
