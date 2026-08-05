import { TransactionType } from "@prisma/client";
import { z } from "zod";
import { categorySchema, moneyAmountSchema } from "../../utils/validators.js";

// Reuses the enum Prisma generated from schema.prisma instead of retyping
// "INCOME"/"EXPENSE" as string literals — one source of truth for valid types.
const typeSchema = z.nativeEnum(TransactionType, {
  errorMap: () => ({ message: "Tipo deve ser INCOME ou EXPENSE" }),
});

export const createTransactionSchema = z.object({
  type: typeSchema,
  amount: moneyAmountSchema,
  category: categorySchema,
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

export const listTransactionsQuerySchema = z
  .object({
    startDate: z.coerce.date({ invalid_type_error: "Data inicial inválida" }).optional(),
    endDate: z.coerce.date({ invalid_type_error: "Data final inválida" }).optional(),
    category: z.string().trim().min(1).max(50).optional(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: "Data inicial deve ser anterior ou igual à data final",
    path: ["startDate"],
  });