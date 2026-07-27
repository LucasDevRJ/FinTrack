import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  // bcrypt silently ignores bytes beyond 72, so we cap the input to avoid confusion.
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres").max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});