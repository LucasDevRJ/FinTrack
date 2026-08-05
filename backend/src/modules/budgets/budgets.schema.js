import { z } from "zod";
import { categorySchema, moneyAmountSchema } from "../../utils/validators.js";

export const createBudgetGoalSchema = z.object({
  category: categorySchema,
  monthlyLimit: moneyAmountSchema,
});

export const updateBudgetGoalSchema = createBudgetGoalSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export const idParamSchema = z.object({
  id: z.string().uuid("ID inválido"),
});
