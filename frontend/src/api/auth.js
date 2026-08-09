import apiClient from "./client.js";

export async function registerRequest({ name, email, password }) {
  const { data } = await apiClient.post("/auth/register", { name, email, password });
  return data;
}

export async function loginRequest({ email, password }) {
  const { data } = await apiClient.post("/auth/login", { email, password });
  return data;
}

export async function demoLoginRequest() {
  const { data } = await apiClient.post("/auth/demo-login");
  return data;
}

export async function meRequest() {
  const { data } = await apiClient.get("/auth/me");
  return data;
}

export async function deleteAccountRequest(password) {
  await apiClient.delete("/auth/me", { data: { password } });
}

export async function forgotPasswordRequest(email) {
  const { data } = await apiClient.post("/auth/forgot-password", { email });
  return data;
}

export async function resetPasswordRequest(token, password) {
  const { data } = await apiClient.post("/auth/reset-password", { token, password });
  return data;
}