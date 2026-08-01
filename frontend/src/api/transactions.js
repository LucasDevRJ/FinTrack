import apiClient from "./client.js";

export async function getSummaryRequest() {
  const { data } = await apiClient.get("/transactions/summary");
  return data;
}
