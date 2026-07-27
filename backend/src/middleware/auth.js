import { verifyToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";

// Protects a route: requires a valid "Authorization: Bearer <token>" header.
// On success, attaches the authenticated user's id as req.userId.
export function protect(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError("Não autenticado", 401));
  }

  const token = header.replace("Bearer ", "");

  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    next(new AppError("Token inválido ou expirado", 401));
  }
}