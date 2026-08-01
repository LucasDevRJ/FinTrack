// Wraps a Zod schema into Express middleware: parses req[source] (defaults
// to req.body, but can target req.params/req.query), replaces it with the
// sanitized/typed result, and forwards validation failures to the error
// handler as ZodErrors.
export function validate(schema, source = "body") {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === "query") {
        // req.query is defined as a getter-only accessor on Express 4's
        // request prototype, so `req.query = ...` throws under ESM's
        // implicit strict mode. Redefining the property is the only way
        // to replace it with the parsed/coerced value.
        Object.defineProperty(req, "query", { value: parsed, writable: true, configurable: true });
      } else {
        req[source] = parsed;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}