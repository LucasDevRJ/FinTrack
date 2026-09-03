// Shared by every integration test file. Reuses the same Prisma singleton
// the app itself uses (backend/src/lib/prisma.js) — vitest.config.js's
// loadEnv already points DATABASE_URL at the "fintrack_test" DB before this
// (or app.js) is ever imported, so this connects there, never the real one.
import prisma from "../../src/lib/prisma.js";

// Deletes in child-to-parent order so FK constraints don't reject it —
// simpler than a raw TRUNCATE ... CASCADE, and fine at this DB's size.
export async function resetDb() {
  await prisma.transaction.deleteMany();
  await prisma.recurringTransaction.deleteMany();
  await prisma.budgetGoal.deleteMany();
  await prisma.user.deleteMany();
}

export { prisma };
