import { TransactionType } from "@prisma/client";
import { z } from "zod";
import { categorySchema, moneyAmountSchema } from "../../utils/validators.js";

const typeSchema = z.nativeEnum(TransactionType, {
  errorMap: () => ({ message: "Tipo deve ser INCOME ou EXPENSE" }),
});

const dayOfMonthSchema = z.coerce
  .number({ invalid_type_error: "Dia do mês deve ser numérico" })
  .int("Dia do mês deve ser um número inteiro")
  .min(1, "Dia do mês deve ser entre 1 e 31")
  .max(31, "Dia do mês deve ser entre 1 e 31");

export const createRecurringTransactionSchema = z
  .object({
    type: typeSchema,
    amount: moneyAmountSchema,
    category: categorySchema,
    description: z.string().trim().max(500).optional(),
    dayOfMonth: dayOfMonthSchema,
    startDate: z.coerce.date({ invalid_type_error: "Data inicial inválida" }),
    // .nullable() matters here, not just .optional(): the frontend form
    // sends `endDate: null` (not an omitted key) when "Fim" is left blank.
    // Without .nullable(), z.coerce.date() would coerce that null into
    // `new Date(null)` (the Unix epoch, 1970-01-01) instead of treating it
    // as "no end date" — a valid-looking but wrong-way-too-early date that
    // then fails the startDate <= endDate refine below.
    endDate: z.coerce.date({ invalid_type_error: "Data final inválida" }).optional().nullable(),
  })
  .refine((data) => !data.endDate || data.startDate <= data.endDate, {
    message: "Data final deve ser posterior ou igual à data inicial",
    path: ["endDate"],
  });

// Not built via createRecurringTransactionSchema.partial() — that schema is
// wrapped in .refine(), and ZodEffects doesn't expose .partial(). Kept as a
// separately-declared object instead, same as listTransactionsQuerySchema's
// pattern in transactions.schema.js.
export const updateRecurringTransactionSchema = z
  .object({
    type: typeSchema.optional(),
    amount: moneyAmountSchema.optional(),
    category: categorySchema.optional(),
    description: z.string().trim().max(500).optional(),
    dayOfMonth: dayOfMonthSchema.optional(),
    startDate: z.coerce.date({ invalid_type_error: "Data inicial inválida" }).optional(),
    endDate: z.coerce.date({ invalid_type_error: "Data final inválida" }).optional().nullable(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  })
  .refine((data) => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: "Data final deve ser posterior ou igual à data inicial",
    path: ["endDate"],
  });

export const idParamSchema = z.object({
  id: z.string().uuid("ID inválido"),
});
