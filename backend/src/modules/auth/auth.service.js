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