import apiClient from "./client.js";

export async function registerRequest({ name, email, password }) {
  const { data } = await apiClient.post("/auth/register", { name, email, password });
  return data;
}

export async function loginRequest({ email, password }) {
  const { data } = await apiClient.post("/auth/login", { email, password });
  return data;
}

export async function meRequest() {
  const { data } = await apiClient.get("/auth/me");
  return data;
}