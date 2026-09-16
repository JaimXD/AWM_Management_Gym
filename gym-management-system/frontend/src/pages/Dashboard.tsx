import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  Dumbbell,
  CalendarClock,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "../api/axios";

interface Summary {
  cards: {
    activeMembers: number;
    totalMembers: number;
    totalExercises: number;
    upcomingClasses: number;
  };
  latestMembers: {
    id: number;
    firstName: string;
    lastName: string;
    createdAt: string;
  }[];
  nextClasses: {
    id: number;
    name: string;
    instructor: string;
    date: string;
    capacity: number;
    booked: number;
  }[];
  bookingsByClass: { name: string; reservas: number; capacidad: number }[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}20`, color }}
      >
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-extrabold leading-none">{value}</p>
        <p className="text-xs text-white/40 mt-1.5">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/dashboard/summary")
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-white/40 gap-2">
        <Loader2 className="animate-spin" size={20} /> Cargando dashboard...
      </div>
    );
  }

  if (!data) {
    return <p className="text-white/40">No se pudo cargar la información.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">
          Resumen general de la actividad del gimnasio.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={UserCheck} label="Socios activos" value={data.cards.activeMembers} color="#16bd60" />
        <StatCard icon={Users} label="Socios registrados" value={data.cards.totalMembers} color="#3b82f6" />
        <StatCard icon={Dumbbell} label="Ejercicios" value={data.cards.totalExercises} color="#f59e0b" />
        <StatCard icon={CalendarClock} label="Clases próximas" value={data.cards.upcomingClasses} color="#a855f7" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-bold mb-4">Reservas por clase</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.bookingsByClass}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="name" stroke="#ffffff60" fontSize={12} />
              <YAxis stroke="#ffffff60" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#161a20",
                  border: "1px solid #ffffff15",
                  borderRadius: 10,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="reservas" fill="#16bd60" radius={[6, 6, 0, 0]} />
              <Bar dataKey="capacidad" fill="#2a313c" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-bold mb-4">Próximas clases</h3>
          <div className="space-y-3">
            {data.nextClasses.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg bg-ink-900 border border-white/5 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-white/40">{c.instructor}</p>
                </div>
                <span className="badge bg-brand-500/15 text-brand-400">
                  {c.booked}/{c.capacity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-4">Últimos socios registrados</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {data.latestMembers.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg bg-ink-900 border border-white/5 px-3 py-2.5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-400 font-bold text-sm">
                {m.firstName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {m.firstName} {m.lastName}
                </p>
                <p className="text-xs text-white/40">
                  {new Date(m.createdAt).toLocaleDateString("es-EC")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
