import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import axios, { isAxiosError } from "axios";
import { useAuth } from "../context/AuthContext";

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
    <div className="min-h-screen flex items-center justify-center px-4 bg-ink-900">
      <div className="card w-full max-w-md p-7 space-y-4">
        <h1 className="text-xl font-bold">
          {token ? "Establecer nueva contraseña" : "Recuperar contraseña"}
        </h1>
        {!token && <p className="text-sm text-white/60">
          Introduce el correo de tu cuenta de acceso a GYMCORE.
        </p>}
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {message && <p role="status" className="text-sm text-brand-300">{message}</p>}
        {!done && <form onSubmit={submit} className="space-y-4">
          {token ? <>
            <div>
              <label className="label-field" htmlFor="new-password">Nueva contraseña</label>
              <input id="new-password" type="password" autoComplete="new-password"
                className="input-field" minLength={12} maxLength={72} required
                value={password} disabled={busy} onChange={e => setPassword(e.target.value)} />
              <p className="mt-1 text-xs text-white/50">Mínimo 12 caracteres.</p>
            </div>
            <div>
              <label className="label-field" htmlFor="confirm-password">Repite la contraseña</label>
              <input id="confirm-password" type="password" autoComplete="new-password"
                className="input-field" minLength={12} maxLength={72} required
                value={confirmation} disabled={busy}
                onChange={e => setConfirmation(e.target.value)} />
            </div>
          </> : <div>
            <label className="label-field" htmlFor="recovery-email">Correo electrónico</label>
            <input id="recovery-email" type="email" autoComplete="email"
              className="input-field" required maxLength={254} value={email}
              disabled={busy} onChange={e => setEmail(e.target.value)} />
          </div>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Procesando..." : token ? "Guardar contraseña" : "Enviar enlace"}
          </button>
        </form>}
        {token && !done && <a href="/recuperar-password"
          className="block text-sm text-brand-400">Solicitar otro enlace</a>}
        <Link to="/login" className="block text-sm text-white/60 hover:text-white">
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}
