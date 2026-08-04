import * as transactionsService from "./transactions.service.js";

export async function create(req, res, next) {
  try {
    const transaction = await transactionsService.createTransaction(req.userId, req.body);
    res.status(201).json(transaction);
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const transactions = await transactionsService.listTransactions(req.userId, req.query);
    res.status(200).json(transactions);
  } catch (err) {
    next(err);
  }
}

export async function exportCsv(req, res, next) {
  try {
    const csv = await transactionsService.exportTransactionsCsv(req.userId, req.query);
    const filename = `fintrack-transacoes-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}

export async function summary(req, res, next) {
  try {
    const data = await transactionsService.getSummary(req.userId);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const transaction = await transactionsService.getTransactionById(req.userId, req.params.id);
    res.status(200).json(transaction);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const transaction = await transactionsService.updateTransaction(
      req.userId,
      req.params.id,
      req.body
    );
    res.status(200).json(transaction);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await transactionsService.deleteTransaction(req.userId, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}