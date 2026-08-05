import { z } from "zod";

// Shared across any module that stores a money value (transactions, budget
// goals, ...) so the rules — positive, capped, at most 2 decimal places —
// stay in one place instead of being retyped per schema.
export const moneyAmountSchema = z.coerce
  .number({ invalid_type_error: "Valor deve ser numérico" })
  .positive("Valor deve ser maior que zero")
  .max(999_999_999.99, "Valor muito alto")
  .refine((value) => Number.isInteger(value * 100), {
    message: "Valor deve ter no máximo 2 casas decimais",
  });

// Same free-text category rules used by transactions and budget goals.
export const categorySchema = z.string().trim().min(1, "Categoria é obrigatória").max(50);
