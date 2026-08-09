import { useState } from "react";
import { NavLink } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";

function navLinkClass({ isActive }) {
  return `text-sm font-medium ${isActive ? "text-indigo-600" : "text-gray-500 hover:text-gray-900"}`;
}

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/transactions", label: "Transações" },
  { to: "/budgets", label: "Orçamentos" },
  { to: "/recurring", label: "Recorrências" },
  { to: "/account", label: "Minha conta" },
];

export default function Header() {
  const { user, logout } = useAuth();
  // Below `md` there isn't room for the name + 5 nav links + logout button on
  // one line, so they collapse into a hamburger-triggered dropdown instead.
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="min-w-0 truncate text-2xl font-semibold text-gray-900">
          Olá, {user?.name}
        </h1>

        <div className="hidden items-center gap-6 md:flex">
          <nav className="flex gap-4">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={logout}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Sair
          </button>
        </div>

        <button
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={isMenuOpen}
          className="shrink-0 rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-gray-100 md:hidden"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {isMenuOpen && (
        <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={navLinkClass}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={logout}
            className="rounded-md border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}