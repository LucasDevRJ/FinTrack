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

// Downloads the CSV directly rather than returning it, since auth here is
// a Bearer token in localStorage (not a cookie) — a plain <a href> link to
// the endpoint wouldn't carry the Authorization header, so the request has
// to go through the same axios instance and the file gets saved via a
// throwaway blob URL.
export async function exportTransactionsRequest(filters = {}) {
  const params = {};
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.category) params.category = filters.category;

  const response = await apiClient.get("/transactions/export", {
    params,
    responseType: "blob",
  });

  const disposition = response.headers["content-disposition"] ?? "";
  const filename =
    disposition.match(/filename="?([^"]+)"?/)?.[1] ??
    `fintrack-transacoes-${new Date().toISOString().slice(0, 10)}.csv`;

  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
