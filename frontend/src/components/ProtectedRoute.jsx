import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <p className="min-h-screen bg-gray-50 p-8 text-center text-gray-500 dark:bg-gray-900 dark:text-gray-400">
        Carregando...
      </p>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}