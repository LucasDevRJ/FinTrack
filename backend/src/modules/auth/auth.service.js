import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { signToken } from "../../utils/jwt.js";
import { sendPasswordResetEmail } from "../../utils/mailer.js";

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function sanitizeUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

export async function registerUser({ name, email, password }) {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError("Este e-mail já está cadastrado", 409);
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  });

  return { user: sanitizeUser(user), token: signToken(user.id) };
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Same generic message whether the email doesn't exist or the password is
  // wrong — this avoids revealing which emails are registered.
  const invalidCredentialsError = new AppError("E-mail ou senha inválidos", 401);

  if (!user) throw invalidCredentialsError;

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) throw invalidCredentialsError;

  return { user: sanitizeUser(user), token: signToken(user.id) };
}

export async function getUserById(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError("Usuário não encontrado", 404);
  return sanitizeUser(user);
}

export async function deleteUserAccount(id, password) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError("Usuário não encontrado", 404);

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) throw new AppError("Senha incorreta", 401);

  // Transaction rows cascade-delete via the schema's onDelete: Cascade.
  await prisma.user.delete({ where: { id } });
}

const DEMO_EMAIL = "demo@fintrack.app";
const DEMO_NAME = "Visitante Demo";

// Re-seeding wipes and rewrites this user's data on every call (see
// seedDemoData), which is cheap but not free — this throttle just stops
// someone rapid-clicking "Entrar como visitante" (or a bot) from hammering
// the DB with repeat writes. Module-level state is fine here: it only needs
// to survive within one running process, not across restarts.
const DEMO_RESEED_MIN_INTERVAL_MS = 10_000;
let lastDemoSeedAt = 0;

// Returns a date `monthsBack` months before today, on `preferredDay`. For
// the current month (monthsBack === 0) the day is clamped to yesterday at
// the latest, so seeded "this month" transactions can never land in the
// future regardless of what day of the month this actually runs on.
function seedDate(monthsBack, preferredDay) {
  const now = new Date();
  const day =
    monthsBack === 0 ? Math.min(preferredDay, Math.max(now.getUTCDate() - 1, 1)) : preferredDay;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, day));
}

// Realistic-looking dataset for the public demo account: a couple of
// recurring templates (salary + rent — left with lastGeneratedDate unset so
// the very next listTransactions/getSummary call materializes 3 months of
// them through the normal generateDueRecurringTransactions path, same as a
// real user), a spread of one-off expenses across categories, and budget
// goals tuned so one category shows the "over limit" state and two show
// "within limit" — demonstrating both visual states out of the box.
async function seedDemoData(userId) {
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.recurringTransaction.deleteMany({ where: { userId } });
  await prisma.budgetGoal.deleteMany({ where: { userId } });

  await prisma.recurringTransaction.createMany({
    data: [
      {
        userId,
        type: "INCOME",
        amount: 5500,
        category: "Salário",
        description: "Salário mensal",
        dayOfMonth: 5,
        startDate: seedDate(3, 5),
        active: true,
      },
      {
        userId,
        type: "EXPENSE",
        amount: 1400,
        category: "Moradia",
        description: "Aluguel",
        dayOfMonth: 10,
        startDate: seedDate(3, 10),
        active: true,
      },
    ],
  });

  await prisma.transaction.createMany({
    data: [
      { userId, type: "EXPENSE", amount: 320, category: "Alimentação", description: "Supermercado", date: seedDate(0, 3) },
      { userId, type: "EXPENSE", amount: 85, category: "Alimentação", description: "iFood", date: seedDate(0, 7) },
      { userId, type: "EXPENSE", amount: 210, category: "Alimentação", description: "Restaurante", date: seedDate(0, 14) },
      { userId, type: "EXPENSE", amount: 250, category: "Alimentação", description: "Supermercado", date: seedDate(1, 4) },
      { userId, type: "EXPENSE", amount: 60, category: "Transporte", description: "Uber", date: seedDate(0, 6) },
      { userId, type: "EXPENSE", amount: 180, category: "Transporte", description: "Combustível", date: seedDate(0, 12) },
      { userId, type: "EXPENSE", amount: 90, category: "Transporte", description: "Uber", date: seedDate(1, 9) },
      { userId, type: "EXPENSE", amount: 150, category: "Lazer", description: "Cinema e jantar", date: seedDate(0, 16) },
      { userId, type: "EXPENSE", amount: 220, category: "Lazer", description: "Show", date: seedDate(1, 20) },
      { userId, type: "EXPENSE", amount: 120, category: "Saúde", description: "Farmácia", date: seedDate(0, 9) },
      { userId, type: "EXPENSE", amount: 200, category: "Saúde", description: "Consulta médica", date: seedDate(1, 15) },
      { userId, type: "INCOME", amount: 800, category: "Freelance", description: "Projeto extra", date: seedDate(0, 18) },
    ],
  });

  // This-month totals from the transactions above: Alimentação 615 (88% of
  // 700, within limit), Transporte 240 (120% of 200, over limit), Lazer 150
  // (75% of 200, within limit) — fixed sums regardless of the seedDate
  // clamp above, since clamping only ever moves a date earlier within the
  // same month, never out of it.
  await prisma.budgetGoal.createMany({
    data: [
      { userId, category: "Alimentação", monthlyLimit: 700 },
      { userId, category: "Transporte", monthlyLimit: 200 },
      { userId, category: "Lazer", monthlyLimit: 200 },
    ],
  });
}

// Public, password-less "try it out" entry point for portfolio visitors —
// logs into a single well-known demo account, resetting its data to a fresh
// realistic dataset each time (throttled, see above) so every visitor sees
// the same clean state rather than whatever the last visitor left behind.
export async function loginAsDemo() {
  let user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });

  if (!user) {
    // The password is never actually used to log in here (this endpoint
    // mints a token directly), but hash a random one anyway rather than
    // leaving the column empty, in case that ever changes.
    const randomPassword = crypto.randomBytes(32).toString("hex");
    user = await prisma.user.create({
      data: {
        name: DEMO_NAME,
        email: DEMO_EMAIL,
        password: await bcrypt.hash(randomPassword, SALT_ROUNDS),
      },
    });
  }

  if (Date.now() - lastDemoSeedAt > DEMO_RESEED_MIN_INTERVAL_MS) {
    await seedDemoData(user.id);
    lastDemoSeedAt = Date.now();
  }

  return { user: sanitizeUser(user), token: signToken(user.id) };
}

export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Silently no-op for unknown emails so the response can't be used to
  // enumerate registered accounts — the controller always replies the same way.
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordTokenHash: hashToken(rawToken),
      resetPasswordExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

export async function resetPassword(token, newPassword) {
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordTokenHash: hashToken(token),
      resetPasswordExpiresAt: { gt: new Date() },
    },
  });
  if (!user) throw new AppError("Link inválido ou expirado", 400);

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordTokenHash: null,
      resetPasswordExpiresAt: null,
    },
  });
}