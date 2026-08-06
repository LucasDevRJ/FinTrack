import * as recurringService from "./recurring.service.js";

export async function create(req, res, next) {
  try {
    const template = await recurringService.createRecurringTransaction(req.userId, req.body);
    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const templates = await recurringService.listRecurringTransactions(req.userId);
    res.status(200).json(templates);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const template = await recurringService.updateRecurringTransaction(
      req.userId,
      req.params.id,
      req.body
    );
    res.status(200).json(template);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await recurringService.deleteRecurringTransaction(req.userId, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
