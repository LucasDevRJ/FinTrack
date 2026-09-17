import { createContext, useContext, useEffect, useState } from "react";
import {
  changePasswordRequest,
  confirmEmailChangeRequest,
  deleteAccountRequest,
  demoLoginRequest,
  loginRequest,
  meRequest,
  registerRequest,
  requestEmailChangeRequest,
  updateNameRequest,
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

  async function updateName(name) {
    const { user: updatedUser } = await updateNameRequest(name);
    setUser(updatedUser);
  }

  async function requestEmailChange(email) {
    return requestEmailChangeRequest(email);
  }

  // Confirming the e-mail change re-issues a token (same reasoning as
  // verifyEmail above) — the account's e-mail just changed, so this replaces
  // whatever session was active with one that reflects it.
  async function confirmEmailChange(token) {
    const { user: updatedUser, token: authToken } = await confirmEmailChangeRequest(token);
    localStorage.setItem("fintrack_token", authToken);
    setUser(updatedUser);
  }

  async function changePassword(currentPassword, newPassword) {
    return changePasswordRequest(currentPassword, newPassword);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        loginAsDemo,
        register,
        verifyEmail,
        logout,
        deleteAccount,
        updateName,
        requestEmailChange,
        confirmEmailChange,
        changePassword,
      }}
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