"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import type { Appointment, Patient, Client, User, Service } from "@/types";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Textarea from "@/components/ui/textarea";
import AppointmentCalendar from "@/components/appointments/calendar";
import AppointmentWeekView from "@/components/appointments/week-view";
import { Globe } from "lucide-react";
import { useRouter } from "next/navigation";

const statusVariant: Record<string, "info" | "success" | "warning" | "default" | "danger"> = {
  scheduled: "info", confirmed: "success", in_progress: "warning", completed: "default", cancelled: "danger",
};
const statusLabels: Record<string, string> = {
  scheduled: "Agendada", confirmed: "Confirmada", in_progress: "En curso", completed: "Completada", cancelled: "Cancelada",
};
const statusBgColors: Record<string, string> = {
  scheduled: "bg-blue-500", confirmed: "bg-green-500", in_progress: "bg-yellow-500", completed: "bg-gray-400", cancelled: "bg-red-400",
};

type ViewMode = "table" | "month" | "week";

export default function AppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vets, setVets] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    patient_id: "", client_id: "", veterinarian_id: "", service_id: "",
    date: "", start_time: "", end_time: "", reason: "", notes: "", status: "",
  });
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPatient, setFilterPatient] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const fetchData = async (params?: Record<string, string>) => {
    try {
      const [a, p, c, u, s] = await Promise.all([
        api.get("/appointments/", { params }),
        api.get("/patients/"),
        api.get("/clients/"),
        api.get("/users/"),
        api.get("/services/"),
      ]);
      setAppointments(a.data);
      setPatients(p.data);
      setClients(c.data);
      setVets(u.data.filter((u: User) => u.role === "veterinario" || u.role === "admin"));
      setServices(s.data.filter((s: Service) => s.is_active));
    } catch {} finally { setLoading(false); }
  };

  const applyFilters = () => {
    const params: Record<string, string> = {};
    if (filterDateFrom) params.date_from = filterDateFrom;
    if (filterDateTo) params.date_to = filterDateTo;
    if (filterStatus) params.status = filterStatus;
    fetchData(params);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setForm({ patient_id: "", client_id: "", veterinarian_id: "", service_id: "", date: "", start_time: "", end_time: "", reason: "", notes: "", status: "" });
    setEditingId(null);
  };

  const openEdit = (a: Appointment) => {
    setForm({
      patient_id: a.patient_id, client_id: a.client_id, veterinarian_id: a.veterinarian_id,
      service_id: (a as Appointment & { service_id?: string }).service_id || "",
      date: a.date, start_time: a.start_time, end_time: a.end_time || "",
      reason: a.reason || "", notes: a.notes || "", status: a.status,
    });
    setEditingId(a.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const base = {
      end_time: form.end_time || null,
      reason: form.reason || null,
      notes: form.notes || null,
      service_id: form.service_id || null,
    };
    if (editingId) {
      await api.patch(`/appointments/${editingId}`, {
        date: form.date, start_time: form.start_time, status: form.status || undefined, ...base,
      });
    } else {
      await api.post("/appointments/", {
        patient_id: form.patient_id, client_id: form.client_id,
        veterinarian_id: form.veterinarian_id, date: form.date,
        start_time: form.start_time, ...base,
      });
    }
    setShowModal(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Cancelar esta cita?")) return;
    await api.delete(`/appointments/${id}`);
    fetchData();
  };

  const getPatientName = (id: string) => patients.find((p) => p.id === id)?.name || "-";
  const getClientName = (id: string) => { const c = clients.find((c) => c.id === id); return c ? `${c.first_name} ${c.last_name}` : "-"; };
  const getVetName = (id: string) => { const v = vets.find((v) => v.id === id); return v ? `Dr. ${v.first_name} ${v.last_name}` : "-"; };
  const getServiceName = (id?: string) => id ? (services.find((s) => s.id === id)?.name || null) : null;

  const pad = (n: number) => String(n).padStart(2, "0");

  function navigateWeek(dir: 1 | -1) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d);
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    fetchData({
      date_from: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      date_to: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Citas</h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden text-sm">
            {(["table", "month", "week"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 capitalize ${viewMode === v ? "bg-primary-600 text-white" : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
              >
                {v === "table" ? "Tabla" : v === "month" ? "Mes" : "Semana"}
              </button>
            ))}
          </div>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>Nueva Cita</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Paciente</label>
          <input
            type="text" placeholder="Buscar paciente..." value={filterPatient}
            onChange={(e) => setFilterPatient(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-700 dark:text-slate-200 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Desde</label>
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-700 dark:text-slate-200 focus:border-primary-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Hasta</label>
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-700 dark:text-slate-200 focus:border-primary-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Estado</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-700 dark:text-slate-200 focus:border-primary-500 focus:outline-none">
            <option value="">Todos</option>
            {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <button onClick={applyFilters} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">Filtrar</button>
        <button onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); setFilterStatus(""); setFilterPatient(""); fetchData(); }} className="rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700">Limpiar</button>
      </div>

      {/* Views */}
      {viewMode === "month" && (
        <div className="mt-4">
          <AppointmentCalendar
            appointments={appointments}
            year={calYear} month={calMonth}
            onNavigate={(y, m) => {
              setCalYear(y); setCalMonth(m);
              const from = `${y}-${pad(m + 1)}-01`;
              const lastDay = new Date(y, m + 1, 0).getDate();
              fetchData({ date_from: from, date_to: `${y}-${pad(m + 1)}-${pad(lastDay)}` });
            }}
            getPatientName={getPatientName}
            statusColors={statusBgColors}
            onClickAppointment={(a) => router.push(`/dashboard/appointments/${a.id}`)}
          />
        </div>
      )}

      {viewMode === "week" && (
        <div className="mt-4">
          <AppointmentWeekView
            appointments={appointments}
            weekStart={weekStart}
            onNavigate={navigateWeek}
            getPatientName={getPatientName}
            getVetName={getVetName}
            getServiceName={getServiceName}
            statusColors={statusBgColors}
            onClickAppointment={(a) => router.push(`/dashboard/appointments/${a.id}`)}
          />
        </div>
      )}

      {viewMode === "table" && (
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Hora</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Paciente</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Veterinario</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Servicio</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">Cargando...</td></tr>
              ) : appointments.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">No hay citas</td></tr>
              ) : (
                appointments
                  .filter((a) => !filterPatient || getPatientName(a.patient_id).toLowerCase().includes(filterPatient.toLowerCase()))
                  .map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-slate-100">{a.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{a.start_time?.slice(0, 5)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-100">
                        <Link href={`/dashboard/appointments/${a.id}`} className="hover:text-primary-600 dark:hover:text-primary-400 hover:underline">
                          {getPatientName(a.patient_id)}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{getClientName(a.client_id)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{getVetName(a.veterinarian_id)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          {getServiceName(a.service_id ?? undefined) || <span className="text-gray-300 dark:text-slate-600">—</span>}
                          {a.source === "PORTAL" && (
                            <span title="Reservado desde el portal" className="text-blue-500">
                              <Globe className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4"><Badge variant={statusVariant[a.status]}>{statusLabels[a.status]}</Badge></td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Link href={`/dashboard/appointments/${a.id}`}>
                          <Button variant="ghost" size="sm">Ver</Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>Editar</Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(a.id)}>Eliminar</Button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? "Editar Cita" : "Nueva Cita"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Cliente" required value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value, patient_id: "" })} placeholder="Seleccionar" options={clients.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))} />
            <Select label="Paciente" required value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} placeholder="Seleccionar" options={patients.filter((p) => !form.client_id || p.client_id === form.client_id).map((p) => ({ value: p.id, label: p.name }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Veterinario" required value={form.veterinarian_id} onChange={(e) => setForm({ ...form, veterinarian_id: e.target.value })} placeholder="Seleccionar" options={vets.map((v) => ({ value: v.id, label: `Dr. ${v.first_name} ${v.last_name}` }))} />
            <Select label="Servicio" value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })} placeholder="Sin servicio específico" options={services.map((s) => ({ value: s.id, label: `${s.name} (${s.duration_minutes} min)` }))} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Fecha" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Input label="Hora inicio" type="time" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            <Input label="Hora fin" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </div>
          {editingId && (
            <Select label="Estado" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l }))} />
          )}
          <Input label="Motivo" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <Textarea label="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit">{editingId ? "Guardar cambios" : "Agendar cita"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
