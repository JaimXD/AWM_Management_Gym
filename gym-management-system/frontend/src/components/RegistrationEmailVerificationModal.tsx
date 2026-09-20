import { useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Loader2 } from "lucide-react";
import Modal from "./Modal";
import axios from "axios";

const publicApi = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost:4000/api",
  timeout: 30_000,
});

interface Props {
  userId: number;
  email: string;
  onVerified: () => void;
  onClose: () => void;
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return (
      error.response?.data?.message ??
      "No se pudo completar la solicitud."
    );
  }

  return "Ocurrió un error inesperado.";
}

export default function RegistrationEmailVerificationModal({
  userId,
  email,
  onVerified,
  onClose,
}: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    "Introduce el código enviado a tu correo."
  );
  const [busy, setBusy] = useState(false);

  async function confirmCode(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!/^\d{6}$/.test(code)) {
      setError("Introduce los 6 dígitos del código.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await publicApi.post("/auth/verify-email", {
        userId,
        code,
      });

      onVerified();
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title="Verifica tu correo electrónico"
      onClose={() => {
        if (!busy) {
          onClose();
        }
      }}
    >
      <form onSubmit={confirmCode} className="space-y-4">
        <p className="text-sm text-white/60">
          Código enviado a:
          <span className="mt-1 block break-all font-medium text-white">
            {email}
          </span>
        </p>

        {message && (
          <p
            role="status"
            className="rounded-lg bg-brand-500/10 p-3 text-sm text-brand-300"
          >
            {message}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        <div>
          <label
            htmlFor="registration-verification-code"
            className="label-field"
          >
            Código de 6 dígitos
          </label>

          <input
            id="registration-verification-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            className="input-field text-center text-xl tracking-widest"
            value={code}
            onChange={(event) => {
              setCode(
                event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6)
              );
              setError("");
            }}
            disabled={busy}
            required
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="btn-primary w-full"
        >
          {busy && (
            <Loader2 size={16} className="animate-spin" />
          )}
          Verificar correo
        </button>
      </form>
    </Modal>
  );
}