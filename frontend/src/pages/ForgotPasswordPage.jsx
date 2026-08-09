import { useState } from "react";
import { Link } from "react-router";
import { forgotPasswordRequest } from "../api/auth.js";
import { getErrorMessage } from "../utils/apiError.js";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await forgotPasswordRequest(email);
      setIsSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível enviar o e-mail"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow dark:bg-gray-800">
        <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Esqueceu sua senha?
        </h1>

        {isSubmitted ? (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Se o e-mail informado estiver cadastrado, enviamos um link para redefinir sua senha.
            Verifique também a caixa de spam.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Informe seu e-mail e enviaremos um link para você criar uma nova senha.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? "Enviando..." : "Enviar link"}
              </button>
            </form>
          </>
        )}

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          <Link to="/login" className="text-indigo-600 hover:underline dark:text-indigo-400">
            Voltar para o login
          </Link>
        </p>
      </div>
    </main>
  );
}
