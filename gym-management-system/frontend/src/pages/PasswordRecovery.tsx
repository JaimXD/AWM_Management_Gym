import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import axios, { isAxiosError } from "axios";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Zap,
} from "lucide-react";

// Cliente público: no envía el JWT ni redirige por el interceptor de sesión.
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  timeout: 30_000,
});

export default function PasswordRecovery() {
  const { logout } = useAuth();
  const [token] = useState(() =>
    new URLSearchParams(window.location.hash.slice(1)).get("token") || ""
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setMessage("");
    if (token && password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (token && new TextEncoder().encode(password).length > 72) {
      setError("La contraseña es demasiado larga. Usa menos caracteres.");
      return;
    }
    setBusy(true);
    try {
      if (token) {
        const { data } = await publicApi.post<{ message: string }>(
          "/auth/reset-password", { token, password }
        );
        logout();
        setPassword("");
        setConfirmation("");
        window.history.replaceState(null, "", window.location.pathname);
        setMessage(data.message);
        setDone(true);
      } else {
        const { data } = await publicApi.post<{ message: string }>(
          "/auth/forgot-password", { email: email.trim() }
        );
        setMessage(data.message);
      }
    } catch (err: unknown) {
      setError(isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message ?? "No se pudo conectar. Intenta nuevamente."
        : "No se pudo completar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  return (
  <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-ink-900 px-4 py-10 text-white">
    {/* Fondo decorativo */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl"
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl"
    />

    <div className="relative w-full max-w-md">
      {/* Identidad de la aplicación */}
      <div className="mb-8 flex items-center justify-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-ink-900 shadow-lg shadow-brand-500/20">
          <Zap size={24} strokeWidth={2.5} aria-hidden="true" />
        </div>

        <div>
          <p className="text-xl font-extrabold tracking-tight">
            GYMCORE
          </p>
          <p className="text-xs text-white/50">
            Gestión inteligente para tu gimnasio
          </p>
        </div>
      </div>

      <section
        aria-labelledby="recovery-title"
        className="card overflow-hidden"
      >
        <div className="h-1 bg-gradient-to-r from-brand-700 via-brand-400 to-brand-700" />

        <div className="p-6 sm:p-8">
          {/* Encabezado */}
          <div className="mb-7 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-500/20 bg-brand-500/10 text-brand-400">
              {done ? (
                <CheckCircle2 size={30} aria-hidden="true" />
              ) : token ? (
                <KeyRound size={30} aria-hidden="true" />
              ) : (
                <Mail size={30} aria-hidden="true" />
              )}
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-400">
              Recuperación de acceso
            </p>

            <h1
              id="recovery-title"
              className="text-2xl font-bold tracking-tight"
            >
              {done
                ? "Contraseña actualizada"
                : token
                  ? "Crea tu nueva contraseña"
                  : "¿Olvidaste tu contraseña?"}
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-white/60">
              {done
                ? "Ya puedes volver a ingresar con tu nueva contraseña."
                : token
                  ? "Elige una contraseña nueva y confírmala para recuperar el acceso."
                  : "Introduce el correo de tu cuenta y solicita un enlace para recuperar el acceso."}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200"
            >
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <p className="break-words leading-relaxed">{error}</p>
            </div>
          )}

          {/* Respuesta del servidor */}
          {message && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-brand-500/25 bg-brand-500/10 p-4"
            >
              <p className="mb-1 text-sm font-semibold text-brand-300">
                {done ? "Cambio realizado" : "Solicitud recibida"}
              </p>
              <p className="text-sm leading-relaxed text-white/75">
                {message}
              </p>
            </div>
          )}

          {/* Formulario */}
          {!done && (
            <form
              onSubmit={submit}
              aria-busy={busy}
              className="space-y-5"
            >
              {token ? (
                <>
                  <div>
                    <label
                      className="label-field"
                      htmlFor="new-password"
                    >
                      Nueva contraseña
                    </label>

                    <PasswordInput
                      id="new-password"
                      autoComplete="new-password"
                      className="py-3"
                      placeholder="Escribe tu nueva contraseña"
                      minLength={12}
                      maxLength={72}
                      required
                      value={password}
                      disabled={busy}
                      aria-describedby="password-help"
                      onChange={(e) => setPassword(e.target.value)}
                    />

                    <p
                      id="password-help"
                      className="mt-2 text-xs leading-relaxed text-white/50"
                    >
                      Usa al menos 12 caracteres.
                    </p>
                  </div>

                  <div>
                    <label
                      className="label-field"
                      htmlFor="confirm-password"
                    >
                      Confirma la contraseña
                    </label>

                    <PasswordInput
                      id="confirm-password"
                      autoComplete="new-password"
                      className="py-3"
                      placeholder="Vuelve a escribirla"
                      minLength={12}
                      maxLength={72}
                      required
                      value={confirmation}
                      disabled={busy}
                      aria-describedby="confirmation-help"
                      aria-invalid={
                        confirmation.length > 0 &&
                        confirmation !== password
                      }
                      onChange={(e) => setConfirmation(e.target.value)}
                    />

                    <p
                      id="confirmation-help"
                      className={`mt-2 text-xs ${
                        !confirmation
                          ? "text-white/50"
                          : confirmation === password
                            ? "text-brand-300"
                            : "text-red-300"
                      }`}
                    >
                      {!confirmation
                        ? "Ambas contraseñas deben coincidir."
                        : confirmation === password
                          ? "Las contraseñas coinciden."
                          : "Las contraseñas todavía no coinciden."}
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <label
                    className="label-field"
                    htmlFor="recovery-email"
                  >
                    Correo electrónico
                  </label>

                  <div className="relative">
                    <Mail
                      size={18}
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                    />

                    <input
                      id="recovery-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="nombre@correo.com"
                      className="input-field py-3 pl-10"
                      required
                      maxLength={254}
                      value={email}
                      disabled={busy}
                      aria-describedby="email-help"
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <p
                    id="email-help"
                    className="mt-2 text-xs leading-relaxed text-white/50"
                  >
                    Utiliza el correo con el que inicias sesión.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="btn-primary w-full py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-800"
              >
                {busy ? (
                  <>
                    <Loader2
                      size={18}
                      aria-hidden="true"
                      className="animate-spin motion-reduce:animate-none"
                    />
                    Procesando...
                  </>
                ) : (
                  <>
                    {token ? "Guardar nueva contraseña" : "Solicitar enlace"}
                    <ArrowRight size={18} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Acciones posteriores */}
          {done ? (
            <Link
              to="/login"
              className="btn-primary w-full py-3"
            >
              Ir al inicio de sesión
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          ) : (
            <div className="mt-6 space-y-4 border-t border-white/10 pt-5 text-center">
              {token && (
                <a
                  href="/recuperar-password"
                  className="block text-sm font-medium text-brand-400 hover:underline"
                >
                  Solicitar otro enlace
                </a>
              )}

              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Volver al inicio de sesión
              </Link>
            </div>
          )}
        </div>
      </section>

      {!token && (
        <p className="mx-auto mt-5 max-w-sm text-center text-xs leading-relaxed text-white/50">
          Si solicitaste un enlace, revisa también la carpeta de spam.
        </p>
      )}
    </div>
  </main>
);
}
