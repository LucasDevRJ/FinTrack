import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../utils/apiError.js";

// Runs the verification as soon as the link is opened (no button to click —
// the link itself is the confirmation), then auto-logs the user in and sends
// them straight to the dashboard, same as ResetPasswordPage reads its token
// from the query string but this one acts on it immediately instead of
// waiting for a form submit.
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(token ? "verifying" : "missing-token");
  const [error, setError] = useState("");
  const request = useRef(null);

  useEffect(() => {
    if (!token) return;

    // The token is single-use, so the request starts once per token and every
    // effect run waits on that same promise. React's dev StrictMode runs this
    // effect twice (refs survive its remount): calling the API again sent the
    // token twice, and the page showed the second, losing answer — "inválido
    // ou expirado" (#111). `cancelled` only silences an unmounted run.
    if (request.current?.token !== token) {
      request.current = { token, promise: verifyEmail(token) };
    }

    let cancelled = false;
    request.current.promise
      .then(() => {
        if (cancelled) return;
        navigate("/dashboard", { replace: true });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err, "Não foi possível confirmar seu e-mail"));
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for this token
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow dark:bg-gray-800">
        <h1 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Confirmação de e-mail
        </h1>

        {status === "verifying" && (
          <p className="text-sm text-gray-700 dark:text-gray-300">Confirmando seu e-mail...</p>
        )}

        {status === "missing-token" && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Link inválido. Verifique se você abriu o link completo enviado por e-mail.
          </p>
        )}

        {status === "error" && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          <Link to="/login" className="text-indigo-600 hover:underline dark:text-indigo-400">
            Voltar para o login
          </Link>
        </p>
      </div>
    </main>
  );
}
