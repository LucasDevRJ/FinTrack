import apiClient from "./client.js";

export async function listRecurringTransactionsRequest() {
  const { data } = await apiClient.get("/recurring");
  return data;
}

export async function createRecurringTransactionRequest(payload) {
  const { data } = await apiClient.post("/recurring", payload);
  return data;
}

export async function updateRecurringTransactionRequest(id, payload) {
  const { data } = await apiClient.patch(`/recurring/${id}`, payload);
  return data;
}

export async function deleteRecurringTransactionRequest(id) {
  await apiClient.delete(`/recurring/${id}`);
}
