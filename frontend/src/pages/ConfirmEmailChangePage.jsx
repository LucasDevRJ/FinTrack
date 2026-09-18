import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../utils/apiError.js";

// Same pattern as VerifyEmailPage: the link itself is the confirmation, no
// button to click. Opened from the "confirm your new e-mail" message sent to
// the new address (see requestEmailChange in AccountPage) — may not be the
// same browser/session that requested the change, so this doesn't assume the
// visitor is already logged in.
export default function ConfirmEmailChangePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { confirmEmailChange } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(token ? "confirming" : "missing-token");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    confirmEmailChange(token)
      .then(() => {
        if (cancelled) return;
        navigate("/account", { replace: true });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err, "Não foi possível confirmar a troca de e-mail"));
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
          Confirmação de troca de e-mail
        </h1>

        {status === "confirming" && (
          <p className="text-sm text-gray-700 dark:text-gray-300">Confirmando seu novo e-mail...</p>
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
