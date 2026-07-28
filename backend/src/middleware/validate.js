// Wraps a Zod schema into Express middleware: parses req[source] (defaults
// to req.body, but can target req.params/req.query), replaces it with the
// sanitized/typed result, and forwards validation failures to the error
// handler as ZodErrors.
export function validate(schema, source = "body") {
  return (req, res, next) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (err) {
      next(err);
    }
  };
}