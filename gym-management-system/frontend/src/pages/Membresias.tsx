import { useEffect, useState, type FormEvent } from "react";
import { CreditCard, Loader2, Plus, Trash2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../api/axios";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import { useToast } from "../components/useToast";

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  cedula: string;
  status: "ACTIVO" | "INACTIVO";
}

interface Membership {
  id: number;
  memberId: number;
  planName: string;
  startsAt: string;
  expiresAt: string;
  status: "ACTIVA" | "VENCIDA" | "CANCELADA";
  price: number | string;
  member: Member;
}

const emptyForm = {
  memberId: "",
  planName: "Plan mensual",
  startsAt: new Date().toISOString().slice(0, 10),
  expiresAt: "",
  price: "",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
  return isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message ?? fallback
    : fallback;
}

export default function Membresias() {
  const [members, setMembers] = useState<Member[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { toast, showToast, clearToast } = useToast();

  async function loadData() {
    setLoading(true);
    try {
      const [membersResponse, membershipsResponse] = await Promise.all([
        api.get<Member[]>("/members"),
        api.get<Membership[]>("/memberships"),
      ]);
      setMembers(membersResponse.data);
      setMemberships(membershipsResponse.data);
    } catch (error: unknown) {
      showToast("error", getErrorMessage(error, "No se pudieron cargar las membresías"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function openCreate() {
    setForm({
      ...emptyForm,
      startsAt: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!form.memberId || !form.planName.trim() || !form.startsAt || !form.expiresAt || !form.price) {
      showToast("error", "Completa todos los campos de la membresía");
      return;
    }

    if (form.expiresAt <= form.startsAt) {
      showToast("error", "La fecha de vencimiento debe ser posterior al inicio");
      return;
    }

    setSaving(true);
    try {
      await api.post("/memberships", {
        memberId: Number(form.memberId),
        planName: form.planName.trim(),
        startsAt: `${form.startsAt}T00:00:00.000Z`,
        expiresAt: `${form.expiresAt}T23:59:59.000Z`,
        price: Number(form.price),
      });
      setModalOpen(false);
      showToast("success", "Membresía asignada correctamente");
      await loadData();
    } catch (error: unknown) {
      showToast("error", getErrorMessage(error, "No se pudo asignar la membresía"));
    } finally {
      setSaving(false);
    }
  }

  async function removeMembership(membership: Membership) {
    if (!window.confirm("¿Quieres eliminar esta membresía?")) return;

    try {
      await api.delete(`/memberships/${membership.id}`);
      showToast("success", "Membresía eliminada correctamente");
      await loadData();
    } catch (error: unknown) {
      showToast("error", getErrorMessage(error, "No se pudo eliminar la membresía"));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold">Membresías</h1>
          <p className="mt-1 text-sm text-white/40">
            Asigna y administra las membresías de tus socios.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Nueva membresía
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-white/40">
            <Loader2 className="animate-spin" size={18} /> Cargando membresías...
          </div>
        ) : memberships.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-white/40">
            <CreditCard size={32} />
            <p>No hay membresías registradas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-white/40">
                  <th className="px-5 py-3 font-medium">Socio</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Vigencia</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium">Precio</th>
                  <th className="px-5 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((membership) => (
                  <tr key={membership.id} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-4">
                      <p className="font-medium text-white">
                        {membership.member.firstName} {membership.member.lastName}
                      </p>
                      <p className="mt-1 text-xs text-white/40">{membership.member.cedula}</p>
                    </td>
                    <td className="px-5 py-4 text-white/70">{membership.planName}</td>
                    <td className="px-5 py-4 text-white/60">
                      <p>{formatDate(membership.startsAt)}</p>
                      <p className="mt-1 text-xs">hasta {formatDate(membership.expiresAt)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge ${membership.status === "ACTIVA" ? "bg-brand-500/15 text-brand-400" : membership.status === "VENCIDA" ? "bg-amber-500/15 text-amber-300" : "bg-white/5 text-white/40"}`}>
                        {membership.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white/70">${Number(membership.price).toFixed(2)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => void removeMembership(membership)}
                        className="rounded-lg p-2 text-white/50 transition hover:bg-red-500/10 hover:text-red-400"
                        title="Eliminar membresía"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} title="Nueva membresía" onClose={() => !saving && setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-field" htmlFor="membership-member">Socio</label>
            <select
              id="membership-member"
              className="input-field"
              value={form.memberId}
              onChange={(event) => setForm({ ...form, memberId: event.target.value })}
              required
            >
              <option value="">Selecciona un socio</option>
              {members.filter((member) => member.status === "ACTIVO").map((member) => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName} - {member.cedula}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-field" htmlFor="membership-plan">Plan</label>
            <input id="membership-plan" className="input-field" value={form.planName} onChange={(event) => setForm({ ...form, planName: event.target.value })} maxLength={80} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field" htmlFor="membership-start">Inicio</label>
              <input id="membership-start" type="date" className="input-field" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} required />
            </div>
            <div>
              <label className="label-field" htmlFor="membership-end">Vencimiento</label>
              <input id="membership-end" type="date" className="input-field" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} required />
            </div>
          </div>

          <div>
            <label className="label-field" htmlFor="membership-price">Precio</label>
            <input id="membership-price" type="number" min="0" step="0.01" className="input-field" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} required />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Asignar membresía
            </button>
          </div>
        </form>
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}
