import { NavLink } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";

function navLinkClass({ isActive }) {
  return `text-sm font-medium ${isActive ? "text-indigo-600" : "text-gray-500 hover:text-gray-900"}`;
}

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <div className="mb-8 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <h1 className="text-2xl font-semibold text-gray-900">Olá, {user?.name}</h1>
        <nav className="flex gap-4">
          <NavLink to="/dashboard" className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/transactions" className={navLinkClass}>
            Transações
          </NavLink>
          <NavLink to="/budgets" className={navLinkClass}>
            Orçamentos
          </NavLink>
          <NavLink to="/recurring" className={navLinkClass}>
            Recorrências
          </NavLink>
          <NavLink to="/account" className={navLinkClass}>
            Minha conta
          </NavLink>
        </nav>
      </div>
      <button
        onClick={logout}
        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        Sair
      </button>
    </div>
  );
}