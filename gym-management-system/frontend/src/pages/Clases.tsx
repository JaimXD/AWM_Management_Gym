import { useEffect, useState, FormEvent } from "react";
import { Plus, Pencil, Loader2, Clock, CalendarDays } from "lucide-react";
import api from "../api/axios";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import { useToast } from "../components/useToast";

interface GymClass {
  id: number;
  name: string;
  instructor: string;
  date: string;
  capacity: number;
  booked: number;
}

const emptyForm = {
  name: "",
  instructor: "",
  date: "",
  time: "",
  capacity: 10,
};

export default function Clases() {
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GymClass | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast, showToast, clearToast } = useToast();

  async function loadClasses() {
    setLoading(true);
    try {
      const { data } = await api.get("/classes");
      setClasses(data);
    } catch {
      showToast("error", "No se pudieron cargar las clases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClasses();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(c: GymClass) {
    const d = new Date(c.date);
    setEditing(c);
    setForm({
      name: c.name,
      instructor: c.instructor,
      date: d.toISOString().slice(0, 10),
      time: d.toTimeString().slice(0, 5),
      capacity: c.capacity,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const isoDate = new Date(`${form.date}T${form.time}:00`).toISOString();
    try {
      if (editing) {
        await api.put(`/classes/${editing.id}`, {
          name: form.name,
          instructor: form.instructor,
          date: isoDate,
          capacity: form.capacity,
        });
        showToast("success", "Clase actualizada correctamente");
      } else {
        await api.post("/classes", {
          name: form.name,
          instructor: form.instructor,
          date: isoDate,
          capacity: form.capacity,
        });
        showToast("success", "Clase creada correctamente");
      }
      setModalOpen(false);
      loadClasses();
    } catch (err: any) {
      showToast("error", err.response?.data?.message || "Ocurrió un error");
    } finally {
      setSaving(false);
    }
  }

  async function bookTest(c: GymClass) {
    try {
      await api.patch(`/classes/${c.id}/book`);
      showToast("success", "Cupo reservado (datos de prueba)");
      loadClasses();
    } catch (err: any) {
      showToast("error", err.response?.data?.message || "No se pudo reservar");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Clases</h1>
          <p className="text-white/40 text-sm mt-1">Gestiona las clases grupales del gimnasio.</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Nueva clase
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-white/40 gap-2">
          <Loader2 className="animate-spin" size={18} /> Cargando clases...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => {
            const full = c.booked >= c.capacity;
            const date = new Date(c.date);
            return (
              <div key={c.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base">{c.name}</h3>
                    <p className="text-xs text-white/40 mt-0.5">
                      Instructor: {c.instructor}
                    </p>
                  </div>
                  <button
                    onClick={() => openEdit(c)}
                    className="rounded-lg p-1.5 text-white/50 hover:bg-white/5 hover:text-white transition"
                  >
                    <Pencil size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-4 mt-4 text-xs text-white/50">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={13} />
                    {date.toLocaleDateString("es-EC")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} />
                    {date.toTimeString().slice(0, 5)}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                  <span
                    className={`badge ${
                      full ? "bg-red-500/15 text-red-400" : "bg-brand-500/15 text-brand-400"
                    }`}
                  >
                    Cupos: {c.booked}/{c.capacity}
                  </span>
                  <button
                    onClick={() => bookTest(c)}
                    disabled={full}
                    className="btn-secondary !px-3 !py-1.5 text-xs"
                  >
                    {full ? "Sin cupos" : "Reservar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? "Editar clase" : "Nueva clase"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-field">Nombre</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej. Yoga"
              required
            />
          </div>
          <div>
            <label className="label-field">Instructor</label>
            <input
              className="input-field"
              value={form.instructor}
              onChange={(e) => setForm({ ...form, instructor: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Fecha</label>
              <input
                type="date"
                className="input-field"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label-field">Hora</label>
              <input
                type="time"
                className="input-field"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="label-field">Capacidad</label>
            <input
              type="number"
              min={1}
              className="input-field"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Loader2 size={15} className="animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}
