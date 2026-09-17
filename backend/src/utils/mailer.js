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

// Sent to the NEW address requested via "editar perfil" — proves the user
// actually owns it before the account's email column is touched (see
// auth.service.js's requestEmailChange/confirmEmailChange).
export async function sendEmailChangeConfirmation(to, confirmUrl) {
  if (SKIP_SENDING) return;

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Confirme seu novo e-mail no FinTrack",
    html: `
      <p>Recebemos um pedido para usar este endereço como o novo e-mail da sua conta no FinTrack.</p>
      <p><a href="${confirmUrl}">Clique aqui para confirmar a troca de e-mail</a></p>
      <p>Este link expira em 24 horas. Se você não pediu essa troca, pode ignorar este e-mail — seu e-mail atual continua sem alterações.</p>
    `,
  });

  if (error) {
    throw new Error(`Falha ao enviar e-mail via Resend: ${error.message}`);
  }
}

// Security notice sent to the OLD (current) address the moment a change is
// requested — before the new address even confirms it — so the account
// owner finds out immediately if they didn't request this themselves.
export async function sendEmailChangeNotice(to, newEmail) {
  if (SKIP_SENDING) return;

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Solicitação de troca de e-mail na sua conta FinTrack",
    html: `
      <p>Foi solicitada a troca do e-mail desta conta para <strong>${newEmail}</strong>.</p>
      <p>A troca só será concluída se o novo endereço confirmar o link enviado a ele.</p>
      <p>Se não foi você quem pediu essa troca, recomendamos alterar sua senha imediatamente.</p>
    `,
  });

  if (error) {
    throw new Error(`Falha ao enviar e-mail via Resend: ${error.message}`);
  }
}

// Security notice sent right after a successful password change (whether via
// "esqueci minha senha" or the logged-in "editar perfil" flow) — distinct
// from sendPasswordResetEmail above, which sends the reset link itself.
export async function sendPasswordChangedEmail(to) {
  if (SKIP_SENDING) return;

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Sua senha no FinTrack foi alterada",
    html: `
      <p>A senha da sua conta no FinTrack acabou de ser alterada.</p>
      <p>Se não foi você, redefina sua senha imediatamente pela opção "Esqueci minha senha" na tela de login.</p>
    `,
  });

  if (error) {
    throw new Error(`Falha ao enviar e-mail via Resend: ${error.message}`);
  }
}
