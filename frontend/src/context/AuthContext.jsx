import { createContext, useContext, useEffect, useState } from "react";
import {
  deleteAccountRequest,
  demoLoginRequest,
  loginRequest,
  meRequest,
  registerRequest,
  verifyEmailRequest,
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

  // No token comes back here anymore — the account can't log in until the
  // e-mail sent by the backend is confirmed (see verifyEmail below), so
  // there's nothing to store yet. RegisterPage shows a "check your inbox"
  // screen with whatever this resolves to.
  async function register(name, email, password) {
    return registerRequest({ name, email, password });
  }

  async function verifyEmail(token) {
    const { user, token: authToken } = await verifyEmailRequest(token);
    localStorage.setItem("fintrack_token", authToken);
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
      value={{ user, isLoading, login, loginAsDemo, register, verifyEmail, logout, deleteAccount }}
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