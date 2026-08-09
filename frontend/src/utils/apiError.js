// Zod validation failures (see backend/src/middleware/errorHandler.js) come
// back as { message: "Dados inválidos", errors: [{ field, message }] } — the
// top-level message is deliberately generic since multiple fields can fail
// at once, so it's useless to show a user on its own (e.g. "sua senha
// precisa de 8+ caracteres" tells them what to fix; "Dados inválidos"
// doesn't). The first field-specific message is almost always more useful.
// AppError-based failures (wrong password, duplicate category, etc.) only
// ever set `message` and have no `errors` array, so those still show
// correctly via the fallback chain.
export function getErrorMessage(err, fallback) {
  return err.response?.data?.errors?.[0]?.message ?? err.response?.data?.message ?? fallback;
}
