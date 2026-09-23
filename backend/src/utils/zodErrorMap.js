import { ZodIssueCode } from "zod";

// Zod's built-in messages are in English and reach the UI verbatim (the
// frontend shows errors[0].message), so every check a schema doesn't give its
// own message falls back to this map instead. Messages set on the schema
// itself (e.g. "E-mail inválido") still take precedence — Zod only consults
// the global map when the check has none.
const EXPECTED_TYPE_LABELS = {
  string: "um texto",
  number: "um número",
  integer: "um número inteiro",
  boolean: "verdadeiro ou falso",
  date: "uma data",
  object: "um objeto",
  array: "uma lista",
};

function plural(count, singular, pluralForm) {
  return count === 1 ? singular : pluralForm;
}

function sizeMessage(issue, direction) {
  const limit = direction === "min" ? issue.minimum : issue.maximum;
  const bound = direction === "min" ? "pelo menos" : "no máximo";
  const qualifier = issue.exact ? "exatamente" : bound;

  switch (issue.type) {
    case "string":
      return `Deve ter ${qualifier} ${limit} ${plural(Number(limit), "caractere", "caracteres")}`;
    case "array":
    case "set":
      return `Deve ter ${qualifier} ${limit} ${plural(Number(limit), "item", "itens")}`;
    case "number":
    case "bigint": {
      if (issue.exact) return `Deve ser igual a ${limit}`;
      const comparison = direction === "min" ? "maior" : "menor";
      return `Deve ser ${comparison} ${issue.inclusive ? "ou igual a" : "que"} ${limit}`;
    }
    case "date":
      return "Data fora do intervalo permitido";
    default:
      return "Valor fora do intervalo permitido";
  }
}

function invalidTypeMessage(issue) {
  if (issue.received === "undefined" || issue.received === "null") return "Campo obrigatório";
  if (issue.received === "nan") return "Deve ser um número";
  const label = EXPECTED_TYPE_LABELS[issue.expected];
  return label ? `Deve ser ${label}` : "Tipo inválido";
}

const STRING_FORMAT_MESSAGES = {
  email: "E-mail inválido",
  uuid: "ID inválido",
  url: "URL inválida",
};

export function zodErrorMap(issue) {
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      return { message: invalidTypeMessage(issue) };
    case ZodIssueCode.too_small:
      return { message: sizeMessage(issue, "min") };
    case ZodIssueCode.too_big:
      return { message: sizeMessage(issue, "max") };
    case ZodIssueCode.invalid_date:
      return { message: "Data inválida" };
    case ZodIssueCode.invalid_string:
      return { message: STRING_FORMAT_MESSAGES[issue.validation] ?? "Formato inválido" };
    case ZodIssueCode.invalid_enum_value:
      return { message: `Opção inválida. Use: ${issue.options.join(", ")}` };
    case ZodIssueCode.unrecognized_keys:
      return { message: `Campo não reconhecido: ${issue.keys.join(", ")}` };
    case ZodIssueCode.not_multiple_of:
      return { message: `Deve ser múltiplo de ${issue.multipleOf}` };
    case ZodIssueCode.not_finite:
      return { message: "Deve ser um número finito" };
    default:
      return { message: "Valor inválido" };
  }
}
