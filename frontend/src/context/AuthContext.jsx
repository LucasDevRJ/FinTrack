import { createContext, useContext, useEffect, useState } from "react";
import {
  deleteAccountRequest,
  demoLoginRequest,
  loginRequest,
  meRequest,
  registerRequest,
} from "../api/auth.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first load, if a token survived a page refresh, confirm it's still
  // valid (and load the user it belongs to) before deciding whether the
  // visitor is logged in.
  useEffect(() => {
    const token = localStorage.getItem("fintrack_token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    meRequest()
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem("fintrack_token"))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email, password) {
    const { user, token } = await loginRequest({ email, password });
    localStorage.setItem("fintrack_token", token);
    setUser(user);
  }

  async function loginAsDemo() {
    const { user, token } = await demoLoginRequest();
    localStorage.setItem("fintrack_token", token);
    setUser(user);
  }

  async function register(name, email, password) {
    const { user, token } = await registerRequest({ name, email, password });
    localStorage.setItem("fintrack_token", token);
    setUser(user);
  }

  function logout() {
    localStorage.removeItem("fintrack_token");
    setUser(null);
  }

  async function deleteAccount(password) {
    await deleteAccountRequest(password);
    logout();
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, loginAsDemo, register, logout, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}