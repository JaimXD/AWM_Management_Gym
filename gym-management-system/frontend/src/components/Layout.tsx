import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  ClipboardList,
  CalendarDays,
  CreditCard,
  LogOut,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";


const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/socios", label: "Socios", icon: Users },
  { to: "/ejercicios", label: "Ejercicios", icon: Dumbbell },
  { to: "/rutinas", label: "Rutinas", icon: ClipboardList },
  { to: "/clases", label: "Clases", icon: CalendarDays },
  { to: "/membresias", label: "Membresías", icon: CreditCard },
];



export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen w-full bg-ink-900 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/5 bg-ink-800">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-white/5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-ink-900">
            <Zap size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight leading-none">GYMCORE</p>
            <p className="text-[11px] text-white/40">Panel administrativo</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-500/15 text-brand-400 border border-brand-500/30"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/5">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-red-400 transition"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Navbar */}
        <header className="flex items-center justify-between border-b border-white/5 bg-ink-800/60 backdrop-blur px-4 md:px-8 py-4">
          <div className="md:hidden flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-ink-900">
              <Zap size={16} strokeWidth={2.5} />
            </div>
            <span className="font-extrabold">GYMCORE</span>
          </div>
          <p className="hidden md:block text-sm text-white/40">
            Gestión inteligente para tu gimnasio
          </p>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold leading-none">{user?.name}</p>
              <p className="text-[11px] text-white/40 mt-1">
                {user?.role === "ADMIN" ? "Administrador" : "Entrenador"}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/20 text-brand-400 font-bold text-sm border border-brand-500/30">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="md:hidden flex overflow-x-auto gap-1 border-b border-white/5 bg-ink-800 px-3 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                  isActive ? "bg-brand-500/15 text-brand-400" : "text-white/60"
                }`
              }
            >
              <item.icon size={15} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
