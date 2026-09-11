import resend from "../lib/resend.js";

// Vitest's integration suite mocks resend.js directly (see
// tests/setup/mockResend.js), so it never reaches here. But the E2E suite
// (Playwright) talks to a real running Express process — every /register
// call now sends a verification e-mail (see auth.service.js's registerUser),
// and CI has no real Resend key, so without this guard every single
// registration in that suite would fail with a real 401 from Resend, which
// (since authLimiter only skips *successful* requests) would rapid-fire trip
// the rate limiter on top of just failing outright.
const SKIP_SENDING = process.env.NODE_ENV === "test";

export async function sendPasswordResetEmail(to, resetUrl) {
  if (SKIP_SENDING) return;

  // The Resend SDK doesn't throw on API errors — it resolves with
  // { data: null, error } — so a bad key or misconfiguration would otherwise
  // fail silently and the "reset e-mail" would just never arrive.
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Redefinir sua senha no FinTrack",
    html: `
      <p>Recebemos um pedido para redefinir sua senha no FinTrack.</p>
      <p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a></p>
      <p>Este link expira em 30 minutos. Se você não pediu essa redefinição, pode ignorar este e-mail.</p>
    `,
  });

  if (error) {
    throw new Error(`Falha ao enviar e-mail via Resend: ${error.message}`);
  }
}

export async function sendVerificationEmail(to, verifyUrl) {
  if (SKIP_SENDING) return;

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Confirme seu e-mail no FinTrack",
    html: `
      <p>Falta só um passo para ativar sua conta no FinTrack.</p>
      <p><a href="${verifyUrl}">Clique aqui para confirmar seu e-mail</a></p>
      <p>Este link expira em 24 horas. Se você não criou uma conta no FinTrack, pode ignorar este e-mail.</p>
    `,
  });

  if (error) {
    throw new Error(`Falha ao enviar e-mail via Resend: ${error.message}`);
  }
}
