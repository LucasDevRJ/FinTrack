import apiClient from "./client.js";

export async function getSummaryRequest() {
  const { data } = await apiClient.get("/transactions/summary");
  return data;
}

export async function listTransactionsRequest(filters = {}) {
  const params = {};
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.category) params.category = filters.category;

  const { data } = await apiClient.get("/transactions", { params });
  return data;
}

export async function createTransactionRequest(payload) {
  const { data } = await apiClient.post("/transactions", payload);
  return data;
}

export async function updateTransactionRequest(id, payload) {
  const { data } = await apiClient.patch(`/transactions/${id}`, payload);
  return data;
}

export async function deleteTransactionRequest(id) {
  await apiClient.delete(`/transactions/${id}`);
}
