import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";

export function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
}

// Express recognizes this as an error handler specifically because it takes
// 4 arguments (err, req, res, next) — that arity is how it decides to route
// errors here instead of treating it as a normal middleware.
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Dados inválidos",
      errors: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  console.error(err);
  res.status(500).json({ message: "Erro interno do servidor" });
}
