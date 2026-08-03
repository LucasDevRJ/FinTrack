import bcrypt from "bcryptjs";
import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { signToken } from "../../utils/jwt.js";

const SALT_ROUNDS = 10;

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