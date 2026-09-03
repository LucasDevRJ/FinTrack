import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";

function serializeRecurringTransaction(template) {
  return { ...template, amount: Number(template.amount) };
}

// Same ownership-scoping pattern as transactions.service.js's
// findOwnedTransaction: a non-match is a 404, never a 403.
async function findOwnedRecurringTransaction(userId, id) {
  const template = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
  if (!template) throw new AppError("Transação recorrente não encontrada", 404);
  return template;
}

export async function createRecurringTransaction(userId, data) {
  const template = await prisma.recurringTransaction.create({ data: { ...data, userId } });
  return serializeRecurringTransaction(template);
}

export async function listRecurringTransactions(userId) {
  // Catch up first so a user who only opens this page (and never the
  // dashboard/transactions list in the same session) still sees generation
  // reflected — e.g. a badge or "próxima em" derived from lastGeneratedDate.
  await generateDueRecurringTransactions(userId);

  const templates = await prisma.recurringTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return templates.map(serializeRecurringTransaction);
}

export async function updateRecurringTransaction(userId, id, data) {
  await findOwnedRecurringTransaction(userId, id);
  const template = await prisma.recurringTransaction.update({ where: { id }, data });
  return serializeRecurringTransaction(template);
}

export async function deleteRecurringTransaction(userId, id) {
  await findOwnedRecurringTransaction(userId, id);
  // Transaction.recurringTransactionId is onDelete: SetNull, so past
  // generated transactions stay in the ledger, just unlinked from the
  // (now gone) template.
  await prisma.recurringTransaction.delete({ where: { id } });
}

// --- Lazy generation ---
//
// No cron/scheduler infra exists for this app (Railway backend, no worker
// service), and generating on a schedule the user isn't looking at wouldn't
// change anything they'd see any sooner than generating on-read would. So
// instead: every time transaction data is actually read (transactions list,
// dashboard summary, CSV export, budget progress, this module's own list),
// we first materialize any past-due occurrences into real Transaction rows.
// `lastGeneratedDate` makes repeat calls a cheap no-op once caught up.

function daysInMonth(year, monthIndex) {
  // Day 0 of the *next* month is the last day of this one.
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

// Clamps dayOfMonth to the actual last day of shorter months (e.g. a
// dayOfMonth of 31 lands on Feb 28th/29th instead of overflowing into March).
function resolveOccurrenceDate(year, monthIndex, dayOfMonth) {
  const day = Math.min(dayOfMonth, daysInMonth(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, day));
}

// Walks month-by-month from the template's last generated month (or its
// startDate if nothing generated yet) up to the current month, collecting
// every occurrence date that has already happened (<= today) and isn't past
// an optional endDate. Mirrors the UTC-month-bucket approach used throughout
// transactions.service.js to avoid the timezone bucketing bug described
// there.
export function dueOccurrencesForTemplate(template, todayUtc) {
  const occurrences = [];

  const start = new Date(template.startDate);
  let cursor;
  if (template.lastGeneratedDate) {
    // Resume the month *after* the last generated occurrence.
    const last = new Date(template.lastGeneratedDate);
    cursor = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 1));
  } else {
    cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  }

  const todayMonthStart = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), 1));
  const endLimit = template.endDate ? new Date(template.endDate) : null;

  while (cursor <= todayMonthStart) {
    if (endLimit && cursor > endLimit) break;

    const occurrenceDate = resolveOccurrenceDate(
      cursor.getUTCFullYear(),
      cursor.getUTCMonth(),
      template.dayOfMonth
    );
    // Skip an occurrence that would fall before the template's own
    // startDate (e.g. startDate = Aug 15 with dayOfMonth = 5 shouldn't
    // backdate a transaction to Aug 5) and anything not due yet.
    if (occurrenceDate >= start && occurrenceDate <= todayUtc) {
      occurrences.push(occurrenceDate);
    }

    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  return occurrences;
}

export async function generateDueRecurringTransactions(userId) {
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const templates = await prisma.recurringTransaction.findMany({ where: { userId, active: true } });

  for (const template of templates) {
    const occurrences = dueOccurrencesForTemplate(template, todayUtc);
    if (occurrences.length === 0) continue;

    const lastOccurrence = occurrences[occurrences.length - 1];

    await prisma.$transaction([
      prisma.transaction.createMany({
        data: occurrences.map((date) => ({
          type: template.type,
          amount: template.amount,
          category: template.category,
          description: template.description,
          date,
          userId,
          recurringTransactionId: template.id,
        })),
      }),
      prisma.recurringTransaction.update({
        where: { id: template.id },
        data: { lastGeneratedDate: lastOccurrence },
      }),
    ]);
  }
}
