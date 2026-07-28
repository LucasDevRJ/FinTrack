import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

// Prisma returns `amount` as a Decimal instance (precise for DB math), but
// the API just needs to hand it to the frontend for display — a plain
// number is simpler to consume in React/Recharts than a Decimal object.
function serializeTransaction(transaction) {
  return { ...transaction, amount: Number(transaction.amount) };
}

// Scoping every lookup by { id, userId } — not just { id } — is what stops
// user A from reading, editing or deleting user B's transactions by
// guessing an id. If it doesn't match, we treat it the same as "doesn't
// exist" (404), never "exists but isn't yours" (403), so we don't leak
// which ids belong to someone else.
async function findOwnedTransaction(userId, id) {
  const transaction = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!transaction) throw new AppError("Transação não encontrada", 404);
  return transaction;
}

export async function createTransaction(userId, data) {
  const transaction = await prisma.transaction.create({ data: { ...data, userId } });
  return serializeTransaction(transaction);
}

export async function listTransactions(userId) {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });
  return transactions.map(serializeTransaction);
}

export async function getTransactionById(userId, id) {
  const transaction = await findOwnedTransaction(userId, id);
  return serializeTransaction(transaction);
}

export async function updateTransaction(userId, id, data) {
  await findOwnedTransaction(userId, id);
  const transaction = await prisma.transaction.update({ where: { id }, data });
  return serializeTransaction(transaction);
}

export async function deleteTransaction(userId, id) {
  await findOwnedTransaction(userId, id);
  await prisma.transaction.delete({ where: { id } });
}