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

export async function listPendingOccurrencesRequest() {
  const { data } = await apiClient.get("/recurring/pending");
  return data;
}

export async function confirmOccurrenceRequest(id, payload) {
  const { data } = await apiClient.post(`/recurring/${id}/confirm`, payload);
  return data;
}

export async function skipOccurrenceRequest(id, payload) {
  await apiClient.post(`/recurring/${id}/skip`, payload);
}
