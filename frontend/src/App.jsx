import { Navigate, Route, Routes } from "react-router";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import BudgetsPage from "./pages/BudgetsPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RecurringPage from "./pages/RecurringPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import TransactionsPage from "./pages/TransactionsPage.jsx";
import { isDemoUser } from "./utils/demo.js";

// "Minha conta" doesn't make sense for the shared public demo account (see
// issue #13) — bounce direct /account navigation back to the dashboard
// instead of rendering personal-looking info and a delete button that
// isn't meant to work for it. Nested inside ProtectedRoute, so `user` is
// already guaranteed to be loaded here.
function AccountRoute() {
  const { user } = useAuth();
  if (isDemoUser(user)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <AccountPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <TransactionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/budgets"
        element={
          <ProtectedRoute>
            <BudgetsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recurring"
        element={
          <ProtectedRoute>
            <RecurringPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account"
        element={
          <ProtectedRoute>
            <AccountRoute />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
