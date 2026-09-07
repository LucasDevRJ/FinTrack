import { useState } from "react";
import { Link, useNavigate } from "react-router";
import ThemeToggleButton from "../components/ThemeToggleButton.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../utils/apiError.js";

const FEATURES = [
  {
    title: "Transações completas",
    description: "Registre receitas e despesas, busque por texto e filtre por período ou categoria.",
  },
  {
    title: "Metas de orçamento",
    description: "Defina um limite mensal por categoria e acompanhe o progresso com uma barra verde/amarelo/vermelho.",
  },
  {
    title: "Transações recorrentes",
    description: "Cadastre salário, aluguel e outras contas fixas uma vez — os lançamentos são gerados automaticamente.",
  },
  {
    title: "Gráficos e exportação",
    description: "Visualize receitas x despesas e gastos por categoria, e exporte tudo em CSV quando precisar.",
  },
  {
    title: "Modo escuro",
    description: "Tema claro ou escuro, com detecção automática da preferência do seu sistema.",
  },
  {
    title: "Acesso de qualquer lugar",
    description: "Layout responsivo, funciona bem em celular, tablet e desktop.",
  },
];

export default function LandingPage() {
  const { loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  async function handleDemoLogin() {
    setError("");
    setIsDemoLoading(true);
    try {
      await loginAsDemo();
      navigate("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível entrar como visitante"));
    } finally {
      setIsDemoLoading(false);
    }
  }

  return (
    <main className="bg-gray-50 dark:bg-gray-900">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 sm:px-8">
        <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">FinTrack</span>
        <div className="flex items-center gap-4">
          <ThemeToggleButton />
          <Link
            to="/login"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            Entrar
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 pt-8 pb-16 text-center sm:px-8">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl dark:text-gray-100">
          Organize suas finanças pessoais em um só lugar
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600 dark:text-gray-400">
          Controle receitas e despesas, defina metas de orçamento por categoria e acompanhe tudo com gráficos claros
          — sem planilha.
        </p>

        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/register"
            className="w-full rounded-md bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700 sm:w-auto"
          >
            Cadastre-se grátis
          </Link>
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isDemoLoading}
            className="w-full rounded-md border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 sm:w-auto dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {isDemoLoading ? "Entrando..." : "Entrar como visitante"}
          </button>
        </div>

        <img
          src="/screenshots/dashboard-light.jpg"
          alt="Dashboard do FinTrack mostrando saldo, resumo do mês e gráficos"
          className="mt-12 w-full rounded-lg shadow-lg dark:hidden"
        />
        <img
          src="/screenshots/dashboard-dark.jpg"
          alt="Dashboard do FinTrack em modo escuro"
          className="mt-12 hidden w-full rounded-lg shadow-lg dark:block"
        />
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title}>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{feature.title}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <img
            src="/screenshots/transactions.jpg"
            alt="Lista de transações com filtros de período e categoria"
            className="aspect-[1366/633] w-full rounded-lg object-cover object-top shadow-lg"
          />
          <img
            src="/screenshots/budgets.jpg"
            alt="Metas de orçamento com barras de progresso por categoria"
            className="aspect-[1366/633] w-full rounded-lg object-cover object-top shadow-lg"
          />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20 text-center sm:px-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Pronto para começar?</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Leva menos de um minuto para criar sua conta — ou explore com dados de exemplo, sem cadastro.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/register"
            className="w-full rounded-md bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700 sm:w-auto"
          >
            Cadastre-se grátis
          </Link>
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isDemoLoading}
            className="w-full rounded-md border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 sm:w-auto dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {isDemoLoading ? "Entrando..." : "Entrar como visitante"}
          </button>
        </div>
      </section>

      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        Desenvolvido por{" "}
        <a
          href="https://github.com/LucasDevRJ"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Lucas Pereira de Lima
        </a>
      </footer>
    </main>
  );
}
