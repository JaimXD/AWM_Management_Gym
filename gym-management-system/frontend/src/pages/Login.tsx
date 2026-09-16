import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@gym.com");
  const [password, setPassword] = useState("Admin123*");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.message || "No se pudo iniciar sesión");
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-ink-900 relative overflow-hidden px-4">
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-ink-900 mb-4 shadow-lg shadow-brand-500/20">
            <Zap size={28} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">GYMCORE</h1>
          <p className="text-white/40 text-sm mt-1">Gestión inteligente para tu gimnasio</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-7">
          <h2 className="text-lg font-bold mb-1">Iniciar sesión</h2>
          <p className="text-sm text-white/40 mb-6">Ingresa tus credenciales para continuar</p>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="label-field">Correo electrónico</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@gym.com"
              required
            />
          </div>

          <div className="mb-6">
            <label className="label-field">Contraseña</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <div className="mt-6 rounded-xl bg-ink-900 border border-white/5 p-4 text-xs text-white/40 space-y-1.5">
            <p className="font-semibold text-white/60 mb-2">Credenciales de prueba</p>
            <p>Admin: admin@gym.com / Admin123*</p>
            <p>Entrenador: trainer@gym.com / Trainer123*</p>
          </div>
        </form>
      </div>
    </div>
  );
}
