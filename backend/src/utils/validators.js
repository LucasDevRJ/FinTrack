import { z } from "zod";

// Shared across any module that stores a money value (transactions, budget
// goals, ...) so the rules — positive, capped, at most 2 decimal places —
// stay in one place instead of being retyped per schema.
export const moneyAmountSchema = z.coerce
  .number({ invalid_type_error: "Valor deve ser numérico" })
  .positive("Valor deve ser maior que zero")
  .max(999_999_999.99, "Valor muito alto")
  // Not `Number.isInteger(value * 100)`: in floating point 77.9 * 100 is
  // 7790.000000000001, which rejected ~9% of valid amounts (#97). Rounding to
  // cents and comparing asks the real question: is it already a whole cent?
  .refine((value) => Number(value.toFixed(2)) === value, {
    message: "Valor deve ter no máximo 2 casas decimais",
  });

// Same free-text category rules used by transactions and budget goals.
export const categorySchema = z.string().trim().min(1, "Categoria é obrigatória").max(50);
