import { TransactionType } from "@prisma/client";
import { z } from "zod";

// Reuses the enum Prisma generated from schema.prisma instead of retyping
// "INCOME"/"EXPENSE" as string literals — one source of truth for valid types.
const typeSchema = z.nativeEnum(TransactionType, {
  errorMap: () => ({ message: "Tipo deve ser INCOME ou EXPENSE" }),
});

const amountSchema = z.coerce
  .number({ invalid_type_error: "Valor deve ser numérico" })
  .positive("Valor deve ser maior que zero")
  .max(999_999_999.99, "Valor muito alto")
  .refine((value) => Number.isInteger(value * 100), {
    message: "Valor deve ter no máximo 2 casas decimais",
  });

export const createTransactionSchema = z.object({
  type: typeSchema,
  amount: amountSchema,
  category: z.string().trim().min(1, "Categoria é obrigatória").max(50),
  date: z.coerce.date({ invalid_type_error: "Data inválida" }),
  description: z.string().trim().max(500).optional(),
});

export const updateTransactionSchema = createTransactionSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const idParamSchema = z.object({
  id: z.string().uuid("ID inválido"),
});