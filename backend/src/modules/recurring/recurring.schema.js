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
    // Same .nullable() reasoning as endDate below: the form sends
    // `amount: null` for a variable-amount template.
    amount: moneyAmountSchema.optional().nullable(),
    variableAmount: z.boolean().optional().default(false),
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
  })
  .refine((data) => data.variableAmount || data.amount != null, {
    message: "Informe o valor da recorrência",
    path: ["amount"],
  })
  .refine((data) => !data.variableAmount || data.amount == null, {
    message: "Recorrência de valor variável não tem valor fixo",
    path: ["amount"],
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
    // Fixed at creation — see the variableAmount note in schema.prisma.
    variableAmount: z
      .never({
        invalid_type_error: "O tipo de valor não pode ser alterado; crie outra recorrência",
      })
      .optional(),
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

const dueDateSchema = z.coerce.date();

export const confirmOccurrenceSchema = z.object({
  dueDate: dueDateSchema,
  amount: moneyAmountSchema,
  // The day it was actually paid; defaults to the due date when omitted.
  date: z.coerce.date().optional(),
});

export const skipOccurrenceSchema = z.object({
  dueDate: dueDateSchema,
});
