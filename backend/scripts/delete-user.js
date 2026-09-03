// One-off maintenance script for deleting a user account directly against
// the DB — there's no admin delete-user endpoint (see issue #3). Deliberately
// reads DATABASE_URL from process.env as-is (no dotenv import), so it always
// targets whichever database the caller explicitly points it at:
//
//   DATABASE_URL="postgresql://...target-db..." node scripts/delete-user.js someone@example.com
//
// Without --confirm, this is a dry run: it looks up and prints each matching
// user (id, email, and how many transactions/budget goals/recurring
// templates would cascade-delete with them) without touching anything.
// Add --confirm to actually delete.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const confirm = args.includes("--confirm");
  const emails = args.filter((arg) => arg !== "--confirm");

  if (emails.length === 0) {
    console.error("Uso: node scripts/delete-user.js <email> [<email2> ...] [--confirm]");
    process.exitCode = 1;
    return;
  }

  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    include: {
      _count: {
        select: { transactions: true, budgetGoals: true, recurringTransactions: true },
      },
    },
  });

  const foundEmails = new Set(users.map((user) => user.email));
  const notFound = emails.filter((email) => !foundEmails.has(email));
  if (notFound.length > 0) {
    console.warn(`Aviso: e-mail(s) não encontrado(s), ignorando: ${notFound.join(", ")}`);
  }

  if (users.length === 0) {
    console.log("Nenhum usuário encontrado para os e-mails informados.");
    return;
  }

  console.log(
    confirm ? "Apagando:" : "[dry-run] Seria apagado (rode de novo com --confirm para executar):"
  );
  for (const user of users) {
    console.log(
      `  ${user.email} (id: ${user.id}) — ${user._count.transactions} transações, ` +
        `${user._count.budgetGoals} metas de orçamento, ${user._count.recurringTransactions} recorrências`
    );
  }

  if (!confirm) return;

  // Transaction/BudgetGoal/RecurringTransaction all have onDelete: Cascade
  // on their userId FK (schema.prisma), so deleting the user is enough — no
  // need to delete each relation manually first.
  const result = await prisma.user.deleteMany({ where: { email: { in: [...foundEmails] } } });
  console.log(`${result.count} usuário(s) apagado(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
