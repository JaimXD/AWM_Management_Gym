import { useEffect, useState, FormEvent } from "react";
import { Plus, Search, Pencil, Ban, CheckCircle, Loader2 } from "lucide-react";
import api from "../api/axios";
import Modal from "../components/Modal";
import Toast from "../components/Toast";
import { useToast } from "../components/useToast";
import { isAxiosError } from "axios";
import EmailVerificationModal from "../components/EmailVerificationModal";

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  cedula: string;
  email: string;
  emailVerifiedAt: string | null;
  phone: string;
  status: "ACTIVO" | "INACTIVO";
}

interface CreateMemberResponse extends Member {
  emailVerification?: {
    delivery: "accepted" | "unconfirmed";
    message: string;
  };
}

interface VerificationState {
  member: Member;
  message: string;
  wait: boolean;
}

const emptyForm = {
  firstName: "",
  lastName: "",
  cedula: "",
  email: "",
  phone: "",
};

export default function Socios() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast, showToast, clearToast } = useToast();
  const [verification, setVerification] =
  useState<VerificationState | null>(null);

  async function loadMembers(q = "") {
    setLoading(true);
    try {
      const { data } = await api.get("/members", { params: { search: q } });
      setMembers(data);
    } catch {
      showToast("error", "No se pudieron cargar los socios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadMembers(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(m: Member) {
    setEditing(m);
    setForm({
      firstName: m.firstName,
      lastName: m.lastName,
      cedula: m.cedula,
      email: m.email,
      phone: m.phone,
    });
    setModalOpen(true);
  }

  function openVerification(member: Member) {
    setVerification({
      member,
      message:
        "Si ya recibiste un código vigente, introdúcelo. Si todavía no tienes uno, pulsa Enviar / reenviar código.",
      wait: false,
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);

    try {
      if (editing) {
        const { data } = await api.put<Member>(
          `/members/${editing.id}`,
          form
        );

        showToast("success", "Socio actualizado correctamente");

        // El backend invalida la verificación al cambiar el correo.
        if (
          data.email !== editing.email &&
          !data.emailVerifiedAt
        ) {
          setVerification({
            member: data,
            message:
              "El correo cambió y está pendiente de verificar. Pulsa Enviar / reenviar código para recibir uno.",
            wait: false,
          });
        }
      } else {
        const { data } = await api.post<CreateMemberResponse>(
          "/members",
          form
        );

        showToast("success", "Socio creado correctamente");

        const accepted =
          data.emailVerification?.delivery === "accepted";

        setVerification({
          member: data,
          message: accepted
            ? "Se aceptó el envío del código. Revisa tu bandeja de entrada y spam."
            : "El socio se creó, pero no se confirmó el envío. Puedes introducir el código si llega o solicitar otro cuando termine la espera.",
          wait: true,
        });
      }

      setModalOpen(false);
      void loadMembers(search);
    } catch (err: unknown) {
      const message = isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : undefined;

      showToast("error", message ?? "No se pudo guardar el socio");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(m: Member) {
    const newStatus = m.status === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    try {
      await api.patch(`/members/${m.id}/status`, { status: newStatus });
      showToast("success", `Socio marcado como ${newStatus.toLowerCase()}`);
      loadMembers(search);
    } catch {
      showToast("error", "No se pudo cambiar el estado");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Socios</h1>
          <p className="text-white/40 text-sm mt-1">
            Administra los socios registrados en el gimnasio.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Nuevo socio
        </button>
      </div>

      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            className="input-field pl-9"
            placeholder="Buscar por nombre o cédula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-white/40 gap-2">
              <Loader2 className="animate-spin" size={18} /> Cargando socios...
            </div>
          ) : members.length === 0 ? (
            <p className="py-16 text-center text-white/40">No se encontraron socios.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/40 border-b border-white/5">
                  <th className="py-3 pr-4 font-medium">Nombre</th>
                  <th className="py-3 pr-4 font-medium">Cédula</th>
                  <th className="py-3 pr-4 font-medium">Email</th>
                  <th className="py-3 pr-4 font-medium">Teléfono</th>
                  <th className="py-3 pr-4 font-medium">Estado</th>
                  <th className="py-3 pr-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-white/5 last:border-0">
                    <td className="py-3 pr-4 font-medium">
                      {m.firstName} {m.lastName}
                    </td>
                    <td className="py-3 pr-4 text-white/60">{m.cedula}</td>
                    <td className="py-3 pr-4">
                      <div className="text-white/60">{m.email}</div>

                      <span
                        className={`badge mt-1 ${
                          m.emailVerifiedAt
                            ? "bg-brand-500/15 text-brand-400"
                            : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {m.emailVerifiedAt ? "Correo verificado" : "Correo pendiente"}
                      </span>

                      {!m.emailVerifiedAt && (
                        <button
                          type="button"
                          onClick={() => openVerification(m)}
                          className="mt-2 block text-xs font-medium text-brand-400 hover:underline"
                        >
                          Verificar correo
                        </button>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-white/60">{m.phone}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`badge ${
                          m.status === "ACTIVO"
                            ? "bg-brand-500/15 text-brand-400"
                            : "bg-white/5 text-white/40"
                        }`}
                      >
                        {m.status === "ACTIVO" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(m)}
                          className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white transition"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => toggleStatus(m)}
                          className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white transition"
                          title={m.status === "ACTIVO" ? "Desactivar" : "Activar"}
                        >
                          {m.status === "ACTIVO" ? <Ban size={15} /> : <CheckCircle size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={modalOpen} title={editing ? "Editar socio" : "Nuevo socio"} onClose={() => {if (!saving) setModalOpen(false);}}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Nombre</label>
              <input
                className="input-field"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label-field">Apellido</label>
              <input
                className="input-field"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="label-field">Cédula</label>
            <input
              className="input-field"
              value={form.cedula}
              onChange={(e) => setForm({ ...form, cedula: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label-field">Email</label>
            <input
              type="email"
              className="input-field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label-field">Teléfono</label>
            <input
              className="input-field"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
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

        {verification && (
          <EmailVerificationModal
            key={`${verification.member.id}:${verification.member.email}`}
            member={verification.member}
            initialMessage={verification.message}
            initialWait={verification.wait}
            onClose={() => {
              setVerification(null);
              void loadMembers(search);
            }}
            onVerified={(emailVerifiedAt) => {
              const verifiedMember = verification.member;

              setMembers((current) =>
                current.map((member) =>
                  member.id === verifiedMember.id &&
                  member.email === verifiedMember.email
                    ? { ...member, emailVerifiedAt }
                    : member
                )
              );

              setVerification(null);
              showToast("success", "Correo verificado correctamente");
              void loadMembers(search);
            }}
          />
        )}

      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}
