import { useState } from "react";
import { useNavigate } from "react-router";
import Header from "../components/Header.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function AccountPage() {
  const { user, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [isConfirming, setIsConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function cancelDelete() {
    setIsConfirming(false);
    setPassword("");
    setError("");
  }

  async function handleDelete(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await deleteAccount(password);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message ?? "Não foi possível excluir a conta");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <Header />

        <h2 className="mb-6 text-xl font-semibold text-gray-900">Minha conta</h2>

        <div className="mb-6 rounded-lg bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Nome</p>
          <p className="mb-3 text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-500">E-mail</p>
          <p className="text-gray-900">{user?.email}</p>
        </div>

        <div className="rounded-lg border border-red-200 bg-white p-5 shadow">
          <h3 className="font-semibold text-red-700">Excluir conta</h3>
          <p className="mt-1 text-sm text-gray-600">
            Esta ação é permanente e apaga sua conta e todas as suas transações. Não pode ser
            desfeita.
          </p>

          {!isConfirming ? (
            <button
              onClick={() => setIsConfirming(true)}
              className="mt-4 rounded-md border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Excluir minha conta
            </button>
          ) : (
            <form onSubmit={handleDelete} className="mt-4 space-y-3">
              <div>
                <label htmlFor="delete-password" className="block text-sm font-medium text-gray-700">
                  Confirme sua senha para continuar
                </label>
                <input
                  id="delete-password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Excluindo..." : "Confirmar exclusão"}
                </button>
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}