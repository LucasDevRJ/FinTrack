import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { toCsv } from "../../utils/csv.js";

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

export async function listTransactions(userId, filters = {}) {
  const where = { userId };

  if (filters.category) {
    where.category = { contains: filters.category, mode: "insensitive" };
  }

  if (filters.startDate || filters.endDate) {
    where.date = {};
    if (filters.startDate) where.date.gte = filters.startDate;
    if (filters.endDate) where.date.lte = filters.endDate;
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
  });
  return transactions.map(serializeTransaction);
}

const TYPE_LABELS = { INCOME: "Receita", EXPENSE: "Despesa" };
const CSV_HEADERS = ["Data", "Tipo", "Categoria", "Descrição", "Valor"];

// Reuses listTransactions so the export respects the exact same
// startDate/endDate/category filters as the on-screen list. `date` is
// re-sliced to YYYY-MM-DD via the UTC getters (not toLocaleDateString) for
// the same timezone-safety reason as buildMonthlyBreakdown below — the
// stored instant is always UTC midnight for a calendar date. Amount uses a
// comma decimal separator to match the ";" delimiter convention used by
// Brazilian-locale spreadsheet apps.
export async function exportTransactionsCsv(userId, filters = {}) {
  const transactions = await listTransactions(userId, filters);

  const rows = transactions.map((transaction) => {
    const date = new Date(transaction.date);
    const isoDate = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    return [
      isoDate,
      TYPE_LABELS[transaction.type] ?? transaction.type,
      transaction.category,
      transaction.description ?? "",
      transaction.amount.toFixed(2).replace(".", ","),
    ];
  });

  return toCsv(CSV_HEADERS, rows);
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

const MONTHS_IN_SUMMARY = 6;

// `date` fields are calendar dates ("2026-08-01") coerced by zod into a Date
// at UTC midnight, and Postgres stores that exact UTC instant. Reading it
// back with local getters (getMonth/getFullYear) would re-interpret that
// instant in the server's timezone — in UTC-3 (Brazil), midnight UTC on the
// 1st becomes 9pm on the last day of the *previous* month, silently
// shifting every 1st-of-the-month transaction into the wrong bucket. Using
// the UTC getters consistently avoids that regardless of server timezone.
function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Builds one zero-filled bucket per month in the range (oldest first) so the
// chart always shows a continuous 6-month axis, even for months with no
// transactions, then sums each transaction into its bucket by type.
function buildMonthlyBreakdown(transactions, rangeStart) {
  const buckets = new Map();
  for (let i = 0; i < MONTHS_IN_SUMMARY; i++) {
    const bucketDate = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth() + i, 1));
    const key = monthKey(bucketDate);
    buckets.set(key, { month: key, income: 0, expense: 0 });
  }

  for (const transaction of transactions) {
    const bucket = buckets.get(monthKey(new Date(transaction.date)));
    if (!bucket) continue;

    const amount = Number(transaction.amount);
    if (transaction.type === "INCOME") {
      bucket.income += amount;
    } else {
      bucket.expense += amount;
    }
  }

  return Array.from(buckets.values());
}

const CATEGORY_BREAKDOWN_LIMIT = 6;
const OTHER_CATEGORY_LABEL = "Outras";

// Sums the current month's expenses by category, sorted highest first. Past
// the top 6 categories the tail is folded into a single "Outras" bucket
// instead of growing the chart indefinitely — categories are free text, so
// there's no fixed cardinality to design around.
function buildCategoryBreakdown(transactions, currentMonthKey) {
  const totals = new Map();

  for (const transaction of transactions) {
    if (transaction.type !== "EXPENSE") continue;
    if (monthKey(new Date(transaction.date)) !== currentMonthKey) continue;

    const amount = Number(transaction.amount);
    totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + amount);
  }

  const sorted = Array.from(totals, ([category, amount]) => ({ category, amount })).sort(
    (a, b) => b.amount - a.amount
  );

  const top = sorted.slice(0, CATEGORY_BREAKDOWN_LIMIT);
  const rest = sorted.slice(CATEGORY_BREAKDOWN_LIMIT);

  if (rest.length > 0) {
    const otherTotal = rest.reduce((sum, entry) => sum + entry.amount, 0);
    top.push({ category: OTHER_CATEGORY_LABEL, amount: otherTotal });
  }

  return top;
}

export async function getSummary(userId) {
  const now = new Date();
  const rangeStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS_IN_SUMMARY - 1), 1)
  );

  // Two independent queries: an all-time sum per type (for the overall
  // balance) and the raw transactions from the last 6 months (to build the
  // chart). Fetching only 6 months of rows keeps this cheap even as
  // transaction history grows, while the balance still reflects everything.
  const [totalsByType, recentTransactions] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: rangeStart } },
      select: { type: true, amount: true, date: true, category: true },
    }),
  ]);

  const totalFor = (type) =>
    Number(totalsByType.find((entry) => entry.type === type)?._sum.amount ?? 0);
  const balance = totalFor("INCOME") - totalFor("EXPENSE");

  const monthlyBreakdown = buildMonthlyBreakdown(recentTransactions, rangeStart);
  const currentMonth = monthlyBreakdown[monthlyBreakdown.length - 1];

  const categoryBreakdown = buildCategoryBreakdown(recentTransactions, currentMonth.month);

  return {
    balance,
    currentMonth: { income: currentMonth.income, expense: currentMonth.expense },
    monthlyBreakdown,
    categoryBreakdown,
  };
}
