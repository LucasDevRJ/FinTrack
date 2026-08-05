import apiClient from "./client.js";

export async function listBudgetGoalsRequest() {
  const { data } = await apiClient.get("/budgets");
  return data;
}

export async function createBudgetGoalRequest(payload) {
  const { data } = await apiClient.post("/budgets", payload);
  return data;
}

export async function updateBudgetGoalRequest(id, payload) {
  const { data } = await apiClient.patch(`/budgets/${id}`, payload);
  return data;
}

export async function deleteBudgetGoalRequest(id) {
  await apiClient.delete(`/budgets/${id}`);
}
