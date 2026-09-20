import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";
import {
  Zap,
  Loader2,
  AlertCircle,
  Mail,
  LogIn,
  ArrowRight,
} from "lucide-react";
import {
  handlePasteWithoutEmojis,
  isValidEmail,
  removeEmojis,
} from "../utils/inputValidation";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    const normalizedEmail = removeEmojis(email)
      .trim()
      .toLowerCase();

    const cleanPassword = password;

    if (!normalizedEmail) {
      setError("Introduce tu correo electrónico.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError("Introduce un correo electrónico válido.");
      return;
    }

    if (!cleanPassword) {
      setError("Introduce tu contraseña.");
      return;
    }

    if (cleanPassword.length > 72) {
      setError("La contraseña no puede superar los 72 caracteres.");
      return;
    }

    try {
      await login(normalizedEmail, cleanPassword);
      navigate("/");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "No se pudo iniciar sesión"
      );
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
      {/* Identidad de GYMCORE */}
      <div className="mb-8 flex items-center justify-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-ink-900 shadow-lg shadow-brand-500/20">
          <Zap
            size={24}
            strokeWidth={2.5}
            aria-hidden="true"
          />
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
        aria-labelledby="login-title"
        className="card overflow-hidden"
      >
        <div className="h-1 bg-gradient-to-r from-brand-700 via-brand-400 to-brand-700" />

        <div className="p-6 sm:p-8">
          {/* Encabezado */}
          <div className="mb-7 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-500/20 bg-brand-500/10 text-brand-400">
              <LogIn size={30} aria-hidden="true" />
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-400">
              Accede a tu cuenta
            </p>

            <h1
              id="login-title"
              className="text-2xl font-bold tracking-tight"
            >
              Bienvenido a GYMCORE
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Inicia sesión para administrar tu gimnasio.
            </p>
          </div>

          {/* Mensaje de error */}
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

              <div className="min-w-0">
                <p className="mb-1 font-semibold">
                  No se pudo iniciar sesión
                </p>
                <p className="break-words leading-relaxed">
                  {error}
                </p>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            aria-busy={loading}
            className="space-y-5"
          >
            {/* Correo */}
            <div>
              <label
                className="label-field"
                htmlFor="login-email"
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
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  maxLength={254}
                  pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}"
                  title="Introduce un correo válido, por ejemplo: nombre@dominio.com"
                  className="input-field py-3 pl-10"
                  value={email}
                  onChange={(event) =>
                    setEmail(removeEmojis(event.target.value))
                  }
                  onPaste={(event) =>
                    handlePasteWithoutEmojis(event, setEmail)
                  }
                  placeholder="nombre@dominio.com"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label
                className="label-field"
                htmlFor="login-password"
              >
                Contraseña
              </label>

              <PasswordInput
                id="login-password"
                name="password"
                autoComplete="current-password"
                className="py-3"
                maxLength={64}
                value={password}
                onChange={(event) =>
                  setPassword(removeEmojis(event.target.value))
                }
                onPaste={(event) =>
                  handlePasteWithoutEmojis(event, setPassword)
                }
                placeholder="Introduce tu contraseña"
                disabled={loading}
                required
              />

              <div className="mt-3 text-right">
                <Link
                  to="/recuperar-password"
                  className="rounded text-xs font-medium text-brand-400 transition hover:text-brand-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            {/* Ingreso */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-800"
            >
              {loading ? (
                <>
                  <Loader2
                    size={18}
                    aria-hidden="true"
                    className="animate-spin motion-reduce:animate-none"
                  />
                  Ingresando...
                </>
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight size={18} aria-hidden="true" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 border-t border-white/10 pt-5 text-center">
          <p className="text-sm text-white/60">
            ¿No tienes una cuenta?{" "}
            <Link
              to="/registrar"
              className="font-semibold text-brand-400 hover:text-brand-300 hover:underline"
            >
              Crear cuenta
            </Link>
          </p>
        </div>
        </div>
      </section>
    </div>
  </main>
);
}
