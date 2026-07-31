import { useAuth } from "../context/AuthContext.jsx";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Olá, {user?.name}</h1>
          <button
            onClick={logout}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Sair
          </button>
        </div>
        <p className="text-gray-600">
          Dashboard em construção — próxima etapa: resumo financeiro e gráfico.
        </p>
      </div>
    </main>
  );
}