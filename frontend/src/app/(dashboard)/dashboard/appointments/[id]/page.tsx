"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import type { Appointment, Patient, Client, User, Service } from "@/types";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import {
  ChevronLeft, Calendar, Clock, User as UserIcon, PawPrint,
  Phone, Mail, Globe, Stethoscope, FileText, Edit, Trash2,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, "info" | "success" | "warning" | "default" | "danger"> = {
  scheduled: "info", confirmed: "success", in_progress: "warning",
  completed: "default", cancelled: "danger",
};
const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendada", confirmed: "Confirmada", in_progress: "En curso",
  completed: "Completada", cancelled: "Cancelada",
};
const STATUS_TRANSITIONS: Record<string, { label: string; next: string; variant: "default" | "danger" | "info" | "success" | "warning" }[]> = {
  scheduled: [
    { label: "Confirmar", next: "confirmed", variant: "success" },
    { label: "Cancelar", next: "cancelled", variant: "danger" },
  ],
  confirmed: [
    { label: "Iniciar atención", next: "in_progress", variant: "warning" },
    { label: "Cancelar", next: "cancelled", variant: "danger" },
  ],
  in_progress: [
    { label: "Marcar completada", next: "completed", variant: "default" },
  ],
  completed: [],
  cancelled: [],
};

const SPECIES_EMOJI: Record<string, string> = {
  perro: "🐕", gato: "🐈", ave: "🦜", conejo: "🐇", reptil: "🦎",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [appt, setAppt] = useState<Appointment | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [vet, setVet] = useState<User | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allVets, setAllVets] = useState<User[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [editForm, setEditForm] = useState({
    date: "", start_time: "", end_time: "", status: "",
    service_id: "", reason: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  async function load() {
    try {
      const { data: a } = await api.get<Appointment>(`/appointments/${id}`);
      setAppt(a);

      const [patRes, clientRes, vetRes] = await Promise.all([
        api.get<Patient>(`/patients/${a.patient_id}`),
        api.get<Client>(`/clients/${a.client_id}`),
        api.get<User>(`/users/${a.veterinarian_id}`),
      ]);
      setPatient(patRes.data);
      setClient(clientRes.data);
      setVet(vetRes.data);

      if (a.service_id) {
        const { data: svc } = await api.get<Service>(`/services/${a.service_id}`);
        setService(svc);
      }
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  // ── Status transition ──────────────────────────────────────────────────────
  async function updateStatus(next: string) {
    if (!appt) return;
    await api.patch(`/appointments/${appt.id}`, { status: next });
    load();
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!confirm("¿Eliminar esta cita? Esta acción no se puede deshacer.")) return;
    await api.delete(`/appointments/${id}`);
    router.push("/dashboard/appointments");
  }

  // ── Open edit modal ────────────────────────────────────────────────────────
  async function openEdit() {
    if (!appt) return;
    setEditForm({
      date: appt.date,
      start_time: appt.start_time,
      end_time: appt.end_time || "",
      status: appt.status,
      service_id: appt.service_id || "",
      reason: appt.reason || "",
      notes: appt.notes || "",
    });
    // Load lookup lists lazily
    const [p, c, u, s] = await Promise.all([
      api.get("/patients/"),
      api.get("/clients/"),
      api.get("/users/"),
      api.get("/services/"),
    ]);
    setAllPatients(p.data);
    setAllClients(c.data);
    setAllVets(u.data.filter((u: User) => u.role === "veterinario" || u.role === "admin"));
    setAllServices(s.data.filter((s: Service) => s.is_active));
    setShowEdit(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/appointments/${id}`, {
        date: editForm.date,
        start_time: editForm.start_time,
        end_time: editForm.end_time || null,
        status: editForm.status || undefined,
        service_id: editForm.service_id || null,
        reason: editForm.reason || null,
        notes: editForm.notes || null,
      });
      setShowEdit(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  // ── Render guards ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (notFound || !appt) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold text-gray-700 dark:text-slate-300">Cita no encontrada</p>
        <Link href="/dashboard/appointments" className="mt-4 text-sm text-primary-600 dark:text-primary-400 hover:underline">
          ← Volver a citas
        </Link>
      </div>
    );
  }

  const transitions = STATUS_TRANSITIONS[appt.status] || [];
  const petEmoji = SPECIES_EMOJI[(patient?.species || "").toLowerCase()] || "🐾";
  const isPortal = appt.source === "PORTAL";

  const duration =
    appt.end_time && appt.start_time
      ? (() => {
          const [sh, sm] = appt.start_time.split(":").map(Number);
          const [eh, em] = appt.end_time.split(":").map(Number);
          const diff = (eh * 60 + em) - (sh * 60 + sm);
          return diff > 0 ? `${diff} min` : null;
        })()
      : service?.duration_minutes
      ? `${service.duration_minutes} min`
      : null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb + header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/appointments"
            className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 mb-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Citas
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {patient?.name ?? "Cita"} — {formatDate(appt.date)}
          </h1>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <Badge variant={STATUS_VARIANT[appt.status]}>{STATUS_LABELS[appt.status]}</Badge>
            {isPortal && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                <Globe className="h-3 w-3" />
                Reservado online
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={openEdit}>
            <Edit className="h-4 w-4 mr-1.5" />
            Editar
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-4">

        {/* ── When & Service ──────────────────────────────────────────────── */}
        <Card>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoItem icon={<Calendar className="h-4 w-4" />} label="Fecha" value={formatDate(appt.date)} />
            <InfoItem
              icon={<Clock className="h-4 w-4" />}
              label="Hora"
              value={
                appt.end_time
                  ? `${appt.start_time.slice(0, 5)} – ${appt.end_time.slice(0, 5)}`
                  : appt.start_time.slice(0, 5)
              }
              sub={duration ? `Duración: ${duration}` : undefined}
            />
            <InfoItem
              icon={<Stethoscope className="h-4 w-4" />}
              label="Servicio"
              value={service?.name ?? "—"}
              sub={service?.price ? `$${Number(service.price).toLocaleString("es-CL")}` : undefined}
            />
            <InfoItem
              icon={<UserIcon className="h-4 w-4" />}
              label="Veterinario"
              value={vet ? `Dr/a. ${vet.first_name} ${vet.last_name}` : "—"}
            />
          </div>
        </Card>

        {/* ── Paciente ────────────────────────────────────────────────────── */}
        <Card title="Paciente">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-2xl shrink-0">
              {petEmoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900 dark:text-slate-100">{patient?.name}</p>
                {patient?.species && (
                  <span className="text-xs text-gray-500 dark:text-slate-400 capitalize">{patient.species}</span>
                )}
                {patient?.breed && (
                  <span className="text-xs text-gray-400 dark:text-slate-500">· {patient.breed}</span>
                )}
              </div>
              {patient?.birth_date && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  Nac. {formatDate(patient.birth_date)}
                  {patient.weight ? ` · ${patient.weight} kg` : ""}
                </p>
              )}
            </div>
            <Link
              href={`/dashboard/patients/${appt.patient_id}`}
              className="shrink-0 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              <PawPrint className="h-4 w-4 inline mr-1" />
              Ver ficha
            </Link>
          </div>
        </Card>

        {/* ── Cliente ─────────────────────────────────────────────────────── */}
        <Card title="Cliente">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="font-semibold text-gray-900 dark:text-slate-100">
                {client ? `${client.first_name} ${client.last_name}` : "—"}
              </p>
              {client?.email && (
                <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400">
                  <Mail className="h-3.5 w-3.5" /> {client.email}
                </p>
              )}
              {client?.phone && (
                <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400">
                  <Phone className="h-3.5 w-3.5" /> {client.phone}
                </p>
              )}
            </div>
            <Link
              href={`/dashboard/clients/${appt.client_id}`}
              className="shrink-0 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              Ver cliente
            </Link>
          </div>
        </Card>

        {/* ── Guest info (portal bookings) ─────────────────────────────────── */}
        {isPortal && appt.guest_name && (
          <Card>
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Datos ingresados online</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">{appt.guest_name}</p>
                {appt.guest_phone && (
                  <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                    <Phone className="h-3.5 w-3.5" /> {appt.guest_phone}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* ── Motivo / Notas ───────────────────────────────────────────────── */}
        {(appt.reason || appt.notes) && (
          <Card title="Observaciones">
            <div className="space-y-3">
              {appt.reason && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 mb-1">
                    <FileText className="h-3.5 w-3.5 inline mr-1" />
                    Motivo
                  </p>
                  <p className="text-sm text-gray-700 dark:text-slate-300">{appt.reason}</p>
                </div>
              )}
              {appt.notes && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 mb-1">Notas internas</p>
                  <p className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{appt.notes}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ── Status transitions ───────────────────────────────────────────── */}
        {transitions.length > 0 && (
          <Card title="Cambiar estado">
            <div className="flex flex-wrap gap-2">
              {transitions.map((t) => (
                <Button
                  key={t.next}
                  variant={t.variant === "danger" ? "secondary" : "secondary"}
                  size="sm"
                  className={
                    t.variant === "danger"
                      ? "border-red-300 text-red-600 hover:bg-red-50"
                      : t.variant === "success"
                      ? "border-green-300 text-green-700 hover:bg-green-50"
                      : t.variant === "warning"
                      ? "border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                      : ""
                  }
                  onClick={() => updateStatus(t.next)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {/* ── Metadata ─────────────────────────────────────────────────────── */}
        <p className="text-xs text-gray-400 dark:text-slate-500 pb-4">
          Creada el {formatDateTime(appt.created_at)} · ID: {appt.id}
        </p>
      </div>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Editar cita" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input label="Fecha" type="date" required value={editForm.date}
              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
            <Input label="Hora inicio" type="time" required value={editForm.start_time}
              onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })} />
            <Input label="Hora fin" type="time" value={editForm.end_time}
              onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Estado" value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            />
            <Select
              label="Servicio" value={editForm.service_id}
              onChange={(e) => setEditForm({ ...editForm, service_id: e.target.value })}
              placeholder="Sin servicio"
              options={allServices.map((s) => ({ value: s.id, label: `${s.name} (${s.duration_minutes} min)` }))}
            />
          </div>
          <Input label="Motivo" value={editForm.reason}
            onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })} />
          <Textarea label="Notas internas" value={editForm.notes}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowEdit(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:bg-slate-800 dark:border-slate-700">
      {title && <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">{title}</h2>}
      {children}
    </div>
  );
}

function InfoItem({
  icon, label, value, sub,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-gray-400 dark:text-slate-500 mb-1">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function formatDate(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${Number(day)} ${months[Number(m) - 1]} ${y}`;
}

function formatDateTime(dt: string) {
  if (!dt) return "—";
  const d = new Date(dt);
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
