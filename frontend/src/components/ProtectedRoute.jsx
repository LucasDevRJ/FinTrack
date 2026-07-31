import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <p className="p-8 text-center text-gray-500">Carregando...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}