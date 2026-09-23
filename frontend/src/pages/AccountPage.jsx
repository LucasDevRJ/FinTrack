import { useState } from "react";
import { useNavigate } from "react-router";
import Header from "../components/Header.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../utils/apiError.js";

function NameField({ name, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function startEditing() {
    setValue(name);
    setError("");
    setIsEditing(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await onSave(value);
      setIsEditing(false);
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível atualizar o nome"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isEditing) {
    return (
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Nome</p>
        <div className="flex items-center gap-3">
          <p className="text-gray-900 dark:text-gray-100">{name}</p>
          <button
            type="button"
            onClick={startEditing}
            className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Editar
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor="account-name" className="text-sm text-gray-500 dark:text-gray-400">
        Nome
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="account-name"
          type="text"
          required
          minLength={2}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancelar
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}

function EmailField({ email, onRequestChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function startEditing() {
    setValue("");
    setError("");
    setSuccessMessage("");
    setIsEditing(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await onRequestChange(value);
      setIsEditing(false);
      setSuccessMessage(
        `Enviamos um link de confirmação para ${value}. Seu e-mail só muda depois que você clicar nele.`
      );
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível solicitar a troca de e-mail"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isEditing) {
    return (
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">E-mail</p>
        <div className="flex items-center gap-3">
          <p className="text-gray-900 dark:text-gray-100">{email}</p>
          <button
            type="button"
            onClick={startEditing}
            className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Editar
          </button>
        </div>
        {successMessage && (
          <p className="mt-1 text-sm text-green-700 dark:text-green-400">{successMessage}</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor="account-email" className="text-sm text-gray-500 dark:text-gray-400">
        Novo e-mail
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="account-email"
          type="email"
          required
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? "Enviando..." : "Enviar confirmação"}
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancelar
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Vamos enviar um link de confirmação para o novo e-mail. Ele só passa a valer depois de
        confirmado.
      </p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}

function ChangePasswordCard({ onChangePassword }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (newPassword !== confirmPassword) {
      setError("A confirmação não corresponde à nova senha");
      return;
    }

    setIsSubmitting(true);
    try {
      await onChangePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage("Senha alterada com sucesso");
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível alterar a senha"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mb-6 rounded-lg bg-white p-5 shadow dark:bg-gray-800">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">Alterar senha</h3>
      <form onSubmit={handleSubmit} className="mt-4 max-w-xs space-y-3">
        <div>
          <label
            htmlFor="current-password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Senha atual
          </label>
          <input
            id="current-password"
            type="password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
        <div>
          <label
            htmlFor="new-password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Nova senha
          </label>
          <input
            id="new-password"
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
        <div>
          <label
            htmlFor="confirm-new-password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Confirmar nova senha
          </label>
          <input
            id="confirm-new-password"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {successMessage && (
          <p className="text-sm text-green-700 dark:text-green-400">{successMessage}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? "Alterando..." : "Alterar senha"}
        </button>
      </form>
    </div>
  );
}

export default function AccountPage() {
  const { user, deleteAccount, updateName, requestEmailChange, changePassword } = useAuth();
  const navigate = useNavigate();
  const [isConfirming, setIsConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function cancelDelete() {
    setIsConfirming(false);
    setPassword("");
    setError("");
  }

  async function handleDelete(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await deleteAccount(password);
      navigate("/login");
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível excluir a conta"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl">
        <Header />

        <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-gray-100">Minha conta</h2>

        <div className="mb-6 space-y-4 rounded-lg bg-white p-5 shadow dark:bg-gray-800">
          <NameField name={user?.name} onSave={updateName} />
          <EmailField email={user?.email} onRequestChange={requestEmailChange} />
        </div>

        <ChangePasswordCard onChangePassword={changePassword} />

        <div className="rounded-lg border border-red-200 bg-white p-5 shadow dark:border-red-900 dark:bg-gray-800">
          <h3 className="font-semibold text-red-700 dark:text-red-400">Excluir conta</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Esta ação é permanente e apaga sua conta e todas as suas transações. Não pode ser
            desfeita.
          </p>

          {!isConfirming ? (
            <button
              onClick={() => setIsConfirming(true)}
              className="mt-4 rounded-md border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-950"
            >
              Excluir minha conta
            </button>
          ) : (
            <form onSubmit={handleDelete} className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="delete-password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Confirme sua senha para continuar
                </label>
                <input
                  id="delete-password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Excluindo..." : "Confirmar exclusão"}
                </button>
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
