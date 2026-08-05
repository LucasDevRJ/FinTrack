import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

function serializeBudgetGoal(goal) {
  return { ...goal, monthlyLimit: Number(goal.monthlyLimit) };
}

// Same ownership-scoping pattern as transactions.service.js's
// findOwnedTransaction: a non-match is treated as 404, never 403, so we
// never confirm to a caller that a given id belongs to someone else.
async function findOwnedBudgetGoal(userId, id) {
  const goal = await prisma.budgetGoal.findFirst({ where: { id, userId } });
  if (!goal) throw new AppError("Meta de orçamento não encontrada", 404);
  return goal;
}

// Categories are free text, so "Mercado" and "mercado" must count as the
// same goal — a case-insensitive lookup here is what the DB's plain unique
// constraint (schema.prisma) can't express on its own.
async function findConflictingGoal(userId, category, excludeId) {
  return prisma.budgetGoal.findFirst({
    where: {
      userId,
      category: { equals: category, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

export async function createBudgetGoal(userId, data) {
  const conflict = await findConflictingGoal(userId, data.category);
  if (conflict) throw new AppError("Já existe uma meta para esta categoria", 409);

  const goal = await prisma.budgetGoal.create({ data: { ...data, userId } });
  return serializeBudgetGoal(goal);
}

export async function updateBudgetGoal(userId, id, data) {
  await findOwnedBudgetGoal(userId, id);

  if (data.category) {
    const conflict = await findConflictingGoal(userId, data.category, id);
    if (conflict) throw new AppError("Já existe uma meta para esta categoria", 409);
  }

  const goal = await prisma.budgetGoal.update({ where: { id }, data });
  return serializeBudgetGoal(goal);
}

export async function deleteBudgetGoal(userId, id) {
  await findOwnedBudgetGoal(userId, id);
  await prisma.budgetGoal.delete({ where: { id } });
}

function getCurrentMonthRange() {
  const now = new Date();
  // Upper bound is exclusive (the 1st of next month), so this naturally
  // includes every instant of the last day regardless of time-of-day —
  // same UTC-based approach as transactions.service.js's monthKey, to avoid
  // the timezone bucketing bug described there.
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

// Each goal's progress against the *current* calendar month's spending in
// its category — monthlyLimit is a recurring cap, not tied to one specific
// month, so "this month's total" is recomputed fresh on every read rather
// than stored.
export async function listBudgetGoalsWithProgress(userId) {
  const { start, end } = getCurrentMonthRange();

  const [goals, expenses] = await Promise.all([
    prisma.budgetGoal.findMany({ where: { userId }, orderBy: { category: "asc" } }),
    prisma.transaction.findMany({
      where: { userId, type: "EXPENSE", date: { gte: start, lt: end } },
      select: { category: true, amount: true },
    }),
  ]);

  const spentByCategory = new Map();
  for (const expense of expenses) {
    const key = expense.category.toLowerCase();
    spentByCategory.set(key, (spentByCategory.get(key) ?? 0) + Number(expense.amount));
  }

  return goals.map((goal) => {
    const monthlyLimit = Number(goal.monthlyLimit);
    const spent = spentByCategory.get(goal.category.toLowerCase()) ?? 0;
    const percentage = monthlyLimit > 0 ? (spent / monthlyLimit) * 100 : 0;

    return {
      id: goal.id,
      category: goal.category,
      monthlyLimit,
      spent,
      remaining: monthlyLimit - spent,
      percentage,
    };
  });
}
