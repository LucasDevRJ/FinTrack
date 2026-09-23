// Unit tests for the Portuguese Zod error map (issue #71). Registered globally,
// same as app.js, rather than passed per call: a per-call errorMap outranks
// schema-level messages (required_error, invalid_type_error, nativeEnum's
// errorMap) in Zod 3, so it would hide exactly the precedence the app relies on.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { zodErrorMap } from "../../src/utils/zodErrorMap.js";

beforeAll(() => z.setErrorMap(zodErrorMap));
afterAll(() => z.setErrorMap(z.defaultErrorMap));

function messageFor(schema, value) {
  const result = schema.safeParse(value);
  return result.success ? null : result.error.issues[0].message;
}

describe("zodErrorMap", () => {
  it("reports a missing or null field as required", () => {
    expect(messageFor(z.object({ name: z.string() }), {})).toBe("Campo obrigatório");
    expect(messageFor(z.object({ name: z.string() }), { name: null })).toBe("Campo obrigatório");
  });

  it("names the expected type when the value has the wrong type", () => {
    expect(messageFor(z.string(), 5)).toBe("Deve ser um texto");
    expect(messageFor(z.boolean(), "yes")).toBe("Deve ser verdadeiro ou falso");
    expect(messageFor(z.object({}), [])).toBe("Deve ser um objeto");
    expect(messageFor(z.number().int(), 1.5)).toBe("Deve ser um número inteiro");
    expect(messageFor(z.coerce.number(), "abc")).toBe("Deve ser um número");
  });

  it("describes string length limits, with singular/plural", () => {
    expect(messageFor(z.string().max(100), "x".repeat(101))).toBe(
      "Deve ter no máximo 100 caracteres"
    );
    expect(messageFor(z.string().min(1), "")).toBe("Deve ter pelo menos 1 caractere");
    expect(messageFor(z.string().length(3), "ab")).toBe("Deve ter exatamente 3 caracteres");
  });

  it("describes number bounds, distinguishing inclusive from exclusive", () => {
    expect(messageFor(z.number().min(1), 0)).toBe("Deve ser maior ou igual a 1");
    expect(messageFor(z.number().positive(), 0)).toBe("Deve ser maior que 0");
    expect(messageFor(z.number().max(100), 101)).toBe("Deve ser menor ou igual a 100");
  });

  it("reports an unparseable coerced date as invalid", () => {
    expect(messageFor(z.coerce.date(), "not-a-date")).toBe("Data inválida");
    expect(messageFor(z.coerce.date(), undefined)).toBe("Data inválida");
  });

  it("covers string formats and enums", () => {
    expect(messageFor(z.string().email(), "nao-e-email")).toBe("E-mail inválido");
    expect(messageFor(z.string().uuid(), "123")).toBe("ID inválido");
    expect(messageFor(z.enum(["INCOME", "EXPENSE"]), "OTHER")).toBe(
      "Opção inválida. Use: INCOME, EXPENSE"
    );
  });

  it("falls back to a generic Portuguese message for a refine without its own message", () => {
    expect(
      messageFor(
        z.string().refine(() => false),
        "x"
      )
    ).toBe("Valor inválido");
  });

  it("never overrides a message set on the schema itself", () => {
    expect(messageFor(z.string().min(8, "Senha curta"), "abc")).toBe("Senha curta");
    expect(messageFor(z.string({ required_error: "Nome é obrigatório" }), undefined)).toBe(
      "Nome é obrigatório"
    );
    expect(
      messageFor(z.coerce.number({ invalid_type_error: "Valor deve ser numérico" }), "abc")
    ).toBe("Valor deve ser numérico");
  });
});
