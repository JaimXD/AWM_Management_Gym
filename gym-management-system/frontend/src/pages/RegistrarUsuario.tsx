import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import axios, { isAxiosError } from "axios";
import {
  Zap,
  UserPlus,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import PasswordInput from "../components/PasswordInput";
import {
  handlePasteWithoutEmojis,
  isValidEmail,
  removeEmojis,
} from "../utils/inputValidation";

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  timeout: 30_000,
});

export default function RegistrarUsuario() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) {
      return;
    }

    setError("");

    const cleanName = removeEmojis(name).trim();
    const normalizedEmail = removeEmojis(email)
      .trim()
      .toLowerCase();
    const cleanPassword = removeEmojis(password);
    const cleanConfirmation = removeEmojis(confirmation);

    if (!cleanName) {
      setError("Introduce tu nombre.");
      return;
    }

    if (!normalizedEmail) {
      setError("Introduce tu correo electrónico.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError(
        "Introduce un correo válido, por ejemplo: nombre@dominio.com."
      );
      return;
    }

    if (cleanPassword.length < 12) {
      setError("La contraseña debe tener al menos 12 caracteres.");
      return;
    }

    if (new TextEncoder().encode(cleanPassword).length > 72) {
      setError("La contraseña es demasiado larga. Usa menos caracteres.");
      return;
    }

    if (cleanPassword !== cleanConfirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);

    try {
      await publicApi.post("/auth/register", {
        name: cleanName,
        email: normalizedEmail,
        password: cleanPassword,
      });

      setEmail(normalizedEmail);
      setPassword("");
      setConfirmation("");
      setDone(true);
    } catch (err: unknown) {
      setError(
        isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message ??
              "No se pudo conectar con el servidor."
          : "No se pudo crear la cuenta."
      );
    } finally {
      setBusy(false);
    }
  }


  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-ink-900 px-4 py-10 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl"
      />

      <div className="relative w-full max-w-lg">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-ink-900 shadow-lg shadow-brand-500/20">
            <Zap size={24} aria-hidden="true" />
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
          aria-labelledby="register-title"
          className="card overflow-hidden"
        >
          <div className="h-1 bg-gradient-to-r from-brand-700 via-brand-400 to-brand-700" />

          <div className="p-6 sm:p-8">
            <div className="mb-7 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-500/20 bg-brand-500/10 text-brand-400">
                {done ? (
                  <CheckCircle2 size={30} aria-hidden="true" />
                ) : (
                  <UserPlus size={30} aria-hidden="true" />
                )}
              </div>

              <h1
                id="register-title"
                className="text-2xl font-bold tracking-tight"
              >
                {done ? "Tu cuenta está lista" : "Crea tu cuenta"}
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-white/60">
                {done
                  ? "Ya puedes iniciar sesión con tus credenciales."
                  : "Completa tus datos para registrarte como entrenador."}
              </p>
            </div>

            {done ? (
              <div>
                <p
                  role="status"
                  className="mb-6 break-words rounded-xl border border-brand-500/20 bg-brand-500/10 p-4 text-center text-sm leading-relaxed text-brand-200"
                >
                  Cuenta creada correctamente para {email.trim()}.
                </p>

                <Link to="/login" className="btn-primary w-full py-3">
                  Ir al inicio de sesión
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <div
                    role="alert"
                    className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200"
                  >
                    <AlertCircle
                      size={20}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0"
                    />
                    <p className="break-words leading-relaxed">{error}</p>
                  </div>
                )}

                <form
                  onSubmit={handleSubmit}
                  aria-busy={busy}
                  className="space-y-5"
                >
                  <div>
                    <label className="label-field" htmlFor="register-name">
                      Nombre completo
                    </label>
                    <input
                      id="register-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      className="input-field py-3"
                      placeholder="Tu nombre completo"
                      maxLength={120}
                      required
                      disabled={busy}
                      value={name}
                      onChange={(event) =>
                        setName(removeEmojis(event.target.value))
                      }
                      onPaste={(event) =>
                        handlePasteWithoutEmojis(event, setName)
                      }
                    />
                  </div>

                  <div>
                    <label className="label-field" htmlFor="register-email">
                      Correo electrónico
                    </label>
                    <input
                      id="register-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      maxLength={254}
                      pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}"
                      title="Introduce un correo válido, por ejemplo: nombre@dominio.com"
                      className="input-field py-3"
                      placeholder="nombre@dominio.com"
                      required
                      disabled={busy}
                      value={email}
                      onChange={(event) =>
                        setEmail(removeEmojis(event.target.value))
                      }
                      onPaste={(event) =>
                        handlePasteWithoutEmojis(event, setEmail)
                      }
                    />
                  </div>

                  <div>
                    <label
                      className="label-field"
                      htmlFor="register-password"
                    >
                      Contraseña
                    </label>
                    <PasswordInput
                      id="register-password"
                      name="password"
                      autoComplete="new-password"
                      className="py-3"
                      placeholder="Crea una contraseña"
                      minLength={12}
                      maxLength={72}
                      required
                      disabled={busy}
                      value={password}
                      aria-describedby="register-password-help"
                      onChange={(event) =>
                        setPassword(removeEmojis(event.target.value))
                      }
                      onPaste={(event) =>
                        handlePasteWithoutEmojis(event, setPassword)
                      }
                    />
                    <p
                      id="register-password-help"
                      className="mt-2 text-xs text-white/50"
                    >
                      Usa al menos 12 caracteres.
                    </p>
                  </div>

                  <div>
                    <label
                      className="label-field"
                      htmlFor="register-confirmation"
                    >
                      Confirma tu contraseña
                    </label>
                    <PasswordInput
                      id="register-confirmation"
                      name="confirmation"
                      autoComplete="new-password"
                      className="py-3"
                      placeholder="Vuelve a escribirla"
                      minLength={12}
                      maxLength={72}
                      required
                      disabled={busy}
                      value={confirmation}
                      onChange={(event) =>
                        setConfirmation(removeEmojis(event.target.value))
                      }
                      onPaste={(event) =>
                        handlePasteWithoutEmojis(event, setConfirmation)
                      }
                    />
                  </div>

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
                        Creando cuenta...
                      </>
                    ) : (
                      <>
                        <UserPlus size={18} aria-hidden="true" />
                        Crear cuenta
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 border-t border-white/10 pt-5 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
                  >
                    <ArrowLeft size={16} aria-hidden="true" />
                    Ya tengo una cuenta
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}