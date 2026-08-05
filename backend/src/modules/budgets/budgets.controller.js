import * as budgetsService from "./budgets.service.js";

export async function create(req, res, next) {
  try {
    const goal = await budgetsService.createBudgetGoal(req.userId, req.body);
    res.status(201).json(goal);
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const goals = await budgetsService.listBudgetGoalsWithProgress(req.userId);
    res.status(200).json(goals);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const goal = await budgetsService.updateBudgetGoal(req.userId, req.params.id, req.body);
    res.status(200).json(goal);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await budgetsService.deleteBudgetGoal(req.userId, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
