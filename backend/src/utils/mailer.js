import resend from "../lib/resend.js";

export async function sendPasswordResetEmail(to, resetUrl) {
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
