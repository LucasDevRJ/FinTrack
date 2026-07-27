// Wraps a Zod schema into Express middleware: parses req.body, replaces it
// with the sanitized/typed result, and forwards validation failures to the
// error handler as ZodErrors.
export function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}