import { useEffect, useState, FormEvent } from "react";
import { Plus, Loader2, Trash2, ClipboardList } from "lucide-react";
import api from "../api/axios";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import { useToast } from "../components/useToast";

interface Member {
  id: number;
  firstName: string;
  lastName: string;
}

interface Exercise {
  id: number;
  name: string;
}

interface WorkoutItem {
  exerciseId: number;
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number;
}

interface Workout {
  id: number;
  name: string;
  member: { firstName: string; lastName: string };
  items: {
    id: number;
    sets: number;
    reps: number;
    weight: number;
    exercise: { name: string };
  }[];
}

export default function Rutinas() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast, showToast, clearToast } = useToast();

  const [name, setName] = useState("");
  const [memberId, setMemberId] = useState<number | "">("");
  const [items, setItems] = useState<WorkoutItem[]>([]);

  const [currentExerciseId, setCurrentExerciseId] = useState<number | "">("");
  const [currentSets, setCurrentSets] = useState(3);
  const [currentReps, setCurrentReps] = useState(10);
  const [currentWeight, setCurrentWeight] = useState(0);

  async function loadAll() {
    setLoading(true);
    try {
      const [w, m, e] = await Promise.all([
        api.get("/workouts"),
        api.get("/members"),
        api.get("/exercises"),
      ]);
      setWorkouts(w.data);
      setMembers(m.data);
      setExercises(e.data);
    } catch {
      showToast("error", "No se pudo cargar la información");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openCreate() {
    setName("");
    setMemberId("");
    setItems([]);
    setCurrentExerciseId("");
    setCurrentSets(3);
    setCurrentReps(10);
    setCurrentWeight(0);
    setModalOpen(true);
  }

  function addExerciseToRoutine() {
    if (!currentExerciseId) {
      showToast("error", "Selecciona un ejercicio");
      return;
    }
    const ex = exercises.find((e) => e.id === Number(currentExerciseId));
    if (!ex) return;

    setItems([
      ...items,
      {
        exerciseId: ex.id,
        exerciseName: ex.name,
        sets: currentSets,
        reps: currentReps,
        weight: currentWeight,
      },
    ]);
    setCurrentExerciseId("");
    setCurrentSets(3);
    setCurrentReps(10);
    setCurrentWeight(0);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!memberId) {
      showToast("error", "Selecciona un socio");
      return;
    }
    if (items.length === 0) {
      showToast("error", "Agrega al menos un ejercicio");
      return;
    }
    setSaving(true);
    try {
      await api.post("/workouts", {
        name,
        memberId,
        items: items.map(({ exerciseId, sets, reps, weight }) => ({
          exerciseId,
          sets,
          reps,
          weight,
        })),
      });
      showToast("success", "Rutina creada y asignada correctamente");
      setModalOpen(false);
      loadAll();
    } catch (err: any) {
      showToast("error", err.response?.data?.message || "Ocurrió un error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Rutinas</h1>
          <p className="text-white/40 text-sm mt-1">
            Crea y asigna rutinas de entrenamiento a los socios.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Nueva rutina
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-white/40 gap-2">
          <Loader2 className="animate-spin" size={18} /> Cargando rutinas...
        </div>
      ) : workouts.length === 0 ? (
        <p className="py-16 text-center text-white/40">Aún no hay rutinas creadas.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workouts.map((w) => (
            <div key={w.id} className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h3 className="font-bold">{w.name}</h3>
                  <p className="text-xs text-white/40">
                    Socio: {w.member.firstName} {w.member.lastName}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {w.items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between rounded-lg bg-ink-900 border border-white/5 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{it.exercise.name}</span>
                    <span className="text-white/40 text-xs">
                      {it.sets}x{it.reps} · {it.weight}kg
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title="Nueva rutina" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-field">Nombre de la rutina</label>
            <input
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Hipertrofia"
              required
            />
          </div>
          <div>
            <label className="label-field">Socio</label>
            <select
              className="input-field"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value ? Number(e.target.value) : "")}
              required
            >
              <option value="">Selecciona un socio</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-white/10 p-4 space-y-3">
            <p className="text-xs font-semibold text-white/60">Agregar ejercicio</p>
            <select
              className="input-field"
              value={currentExerciseId}
              onChange={(e) =>
                setCurrentExerciseId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Selecciona un ejercicio</option>
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="label-field">Series</label>
                <input
                  type="number"
                  min={1}
                  className="input-field"
                  value={currentSets}
                  onChange={(e) => setCurrentSets(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label-field">Reps</label>
                <input
                  type="number"
                  min={1}
                  className="input-field"
                  value={currentReps}
                  onChange={(e) => setCurrentReps(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label-field">Peso (kg)</label>
                <input
                  type="number"
                  min={0}
                  className="input-field"
                  value={currentWeight}
                  onChange={(e) => setCurrentWeight(Number(e.target.value))}
                />
              </div>
            </div>
            <button type="button" onClick={addExerciseToRoutine} className="btn-secondary w-full">
              <Plus size={15} /> Agregar ejercicio
            </button>
          </div>

          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg bg-ink-900 border border-white/5 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{it.exerciseName}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-white/40 text-xs">
                      {it.sets}x{it.reps} · {it.weight}kg
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-white/40 hover:text-red-400 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Loader2 size={15} className="animate-spin" />}
              Guardar rutina
            </button>
          </div>
        </form>
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}
