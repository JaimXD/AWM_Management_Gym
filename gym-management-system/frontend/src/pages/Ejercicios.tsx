import { useEffect, useState, FormEvent } from "react";
import { Plus, Pencil, Ban, CheckCircle, Loader2, Dumbbell } from "lucide-react";
import api from "../api/axios";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import { useToast } from "../components/useToast";

interface Exercise {
  id: number;
  name: string;
  muscleGroup: string;
  difficulty: "PRINCIPIANTE" | "INTERMEDIO" | "AVANZADO";
  description: string;
  imageUrl: string | null;
  active: boolean;
}

const emptyForm = {
  name: "",
  muscleGroup: "",
  difficulty: "PRINCIPIANTE",
  description: "",
  imageUrl: "",
};

const difficultyColor: Record<string, string> = {
  PRINCIPIANTE: "bg-brand-500/15 text-brand-400",
  INTERMEDIO: "bg-amber-500/15 text-amber-400",
  AVANZADO: "bg-red-500/15 text-red-400",
};

export default function Ejercicios() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast, showToast, clearToast } = useToast();

  async function loadExercises() {
    setLoading(true);
    try {
      const { data } = await api.get("/exercises");
      setExercises(data);
    } catch {
      showToast("error", "No se pudieron cargar los ejercicios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExercises();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(ex: Exercise) {
    setEditing(ex);
    setForm({
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      difficulty: ex.difficulty,
      description: ex.description,
      imageUrl: ex.imageUrl || "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/exercises/${editing.id}`, form);
        showToast("success", "Ejercicio actualizado correctamente");
      } else {
        await api.post("/exercises", form);
        showToast("success", "Ejercicio creado correctamente");
      }
      setModalOpen(false);
      loadExercises();
    } catch (err: any) {
      showToast("error", err.response?.data?.message || "Ocurrió un error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(ex: Exercise) {
    try {
      await api.patch(`/exercises/${ex.id}/status`, { active: !ex.active });
      showToast("success", `Ejercicio ${!ex.active ? "activado" : "desactivado"}`);
      loadExercises();
    } catch {
      showToast("error", "No se pudo cambiar el estado");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Ejercicios</h1>
          <p className="text-white/40 text-sm mt-1">Catálogo de ejercicios disponibles.</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Nuevo ejercicio
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-white/40 gap-2">
          <Loader2 className="animate-spin" size={18} /> Cargando ejercicios...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {exercises.map((ex) => (
            <div key={ex.id} className={`card overflow-hidden ${!ex.active ? "opacity-50" : ""}`}>
              <div className="h-36 w-full bg-ink-900 overflow-hidden">
                {ex.imageUrl ? (
                  <img src={ex.imageUrl} alt={ex.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-white/20">
                    <Dumbbell size={32} />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm">{ex.name}</h3>
                  <span className={`badge shrink-0 ${difficultyColor[ex.difficulty]}`}>
                    {ex.difficulty.charAt(0) + ex.difficulty.slice(1).toLowerCase()}
                  </span>
                </div>
                <p className="text-xs text-white/40 mt-1">{ex.muscleGroup}</p>
                <p className="text-xs text-white/50 mt-2 line-clamp-2">{ex.description}</p>

                <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-white/5">
                  <button
                    onClick={() => openEdit(ex)}
                    className="rounded-lg p-1.5 text-white/50 hover:bg-white/5 hover:text-white transition"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => toggleActive(ex)}
                    className="rounded-lg p-1.5 text-white/50 hover:bg-white/5 hover:text-white transition"
                  >
                    {ex.active ? <Ban size={14} /> : <CheckCircle size={14} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? "Editar ejercicio" : "Nuevo ejercicio"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-field">Nombre</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Grupo muscular</label>
              <input
                className="input-field"
                value={form.muscleGroup}
                onChange={(e) => setForm({ ...form, muscleGroup: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label-field">Dificultad</label>
              <select
                className="input-field"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              >
                <option value="PRINCIPIANTE">Principiante</option>
                <option value="INTERMEDIO">Intermedio</option>
                <option value="AVANZADO">Avanzado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label-field">Descripción</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label-field">URL de imagen / GIF</label>
            <input
              className="input-field"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://..."
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
