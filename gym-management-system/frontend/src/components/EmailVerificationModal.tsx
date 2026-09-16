import { FormEvent, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Loader2 } from "lucide-react";
import api from "../api/axios";
import Modal from "./Modal";

interface Props {
  member: {
    id: number;
    email: string;
  };
  initialMessage: string;
  initialWait: boolean;
  onClose: () => void;
  onVerified: (emailVerifiedAt: string) => void;
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return (
      error.response?.data?.message ??
      "No se pudo completar la solicitud. Intenta nuevamente."
    );
  }

  return "Ocurrió un error inesperado.";
}

export default function EmailVerificationModal({
  member,
  initialMessage,
  initialWait,
  onClose,
  onVerified,
}: Props) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<
    "send" | "confirm" | null
  >(null);
  const [seconds, setSeconds] = useState(initialWait ? 60 : 0);

  // Impide peticiones duplicadas por clics muy rápidos.
  const requestInProgress = useRef(false);
  const busy = pending !== null;

  useEffect(() => {
    if (seconds <= 0) return;

    const timer = window.setTimeout(() => {
      setSeconds((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [seconds]);

  function closeModal() {
    if (!requestInProgress.current) {
      onClose();
    }
  }

  async function sendCode() {
    if (requestInProgress.current || seconds > 0) return;

    requestInProgress.current = true;
    setPending("send");
    setError("");
    setMessage("");

    // Un nuevo envío puede invalidar el código anterior.
    setCode("");

    try {
      await api.post(
        `/members/${member.id}/email-verification/send`
      );

      setSeconds(60);
      setMessage(
        "Se aceptó el envío. Revisa tu bandeja de entrada y spam. Usa el código más reciente."
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err));

      // El backend puede haber generado el código aunque
      // el envío falle o no recibamos la respuesta.
      if (
        !isAxiosError(err) ||
        !err.response ||
        err.response.status === 502
      ) {
        setSeconds(60);
      }
    } finally {
      requestInProgress.current = false;
      setPending(null);
    }
  }

  async function confirmCode(event: FormEvent) {
    event.preventDefault();

    if (requestInProgress.current) return;

    if (!/^\d{6}$/.test(code)) {
      setError("Introduce los 6 dígitos del código.");
      return;
    }

    requestInProgress.current = true;
    setPending("confirm");
    setError("");
    setMessage("");

    let verifiedAt: string | null = null;

    try {
      const { data } = await api.post<{
        emailVerifiedAt: string;
      }>(
        `/members/${member.id}/email-verification/confirm`,
        { code }
      );

      if (
        typeof data.emailVerifiedAt !== "string" ||
        !Number.isFinite(Date.parse(data.emailVerifiedAt))
      ) {
        throw new Error("Respuesta de verificación inválida");
      }

      verifiedAt = data.emailVerifiedAt;
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      requestInProgress.current = false;
      setPending(null);
    }

    if (verifiedAt !== null) {
      onVerified(verifiedAt);
    }
  }

  return (
    <Modal
      open
      title="Verificar correo electrónico"
      onClose={closeModal}
    >
      <form onSubmit={confirmCode} className="space-y-4">
        <p className="text-sm text-white/60">
          Correo del socio:
          <span className="mt-1 block break-all font-medium text-white">
            {member.email}
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
            id="verification-error"
            role="alert"
            className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        <div>
          <label
            htmlFor="verification-code"
            className="label-field"
          >
            Código de 6 dígitos
          </label>

          <input
            id="verification-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            placeholder="000000"
            className="input-field text-center text-xl tracking-widest"
            value={code}
            onChange={(event) => {
              setCode(
                event.target.value.replace(/\D/g, "").slice(0, 6)
              );
              setError("");
            }}
            disabled={busy}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? "verification-error" : undefined
            }
            autoFocus
            required
          />
        </div>

        <p className="text-xs text-white/40">
          El código vence a los 10 minutos. Si solicitas otro,
          utiliza el del último correo.
        </p>

        <button
          type="button"
          onClick={sendCode}
          disabled={busy || seconds > 0}
          className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending === "send" && (
            <Loader2 size={16} className="animate-spin" />
          )}

          {pending === "send"
            ? "Enviando..."
            : seconds > 0
              ? `Puedes reenviar en ${seconds}s`
              : "Enviar / reenviar código"}
        </button>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={closeModal}
            disabled={busy}
            className="btn-secondary disabled:opacity-50"
          >
            Más tarde
          </button>

          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="btn-primary"
          >
            {pending === "confirm" && (
              <Loader2 size={16} className="animate-spin" />
            )}
            {pending === "confirm" ? "Verificando..." : "Verificar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}