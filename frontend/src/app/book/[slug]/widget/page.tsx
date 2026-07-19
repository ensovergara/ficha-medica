"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { bookingApi } from "@/lib/public-api";
import { Service, PublicVet, AvailableSlot } from "@/types";
import { ChevronLeft, ChevronRight, Check, Clock } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingForm {
  service_id: string;
  veterinarian_id: string;
  date: string;
  start_time: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  pet_name: string;
  pet_species: string;
  reason: string;
}

const STEPS = ["Servicio", "Veterinario", "Fecha y hora", "Datos", "Confirmar"];
const DAYS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const SPECIES = ["Perro", "Gato", "Ave", "Conejo", "Reptil", "Otro"];

// ─── Component ────────────────────────────────────────────────────────────────

function WidgetContent() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();

  // Brand color from embed script (data-color attribute)
  const color = searchParams.get("color") || "#2563eb";

  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [vets, setVets] = useState<PublicVet[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const [form, setForm] = useState<BookingForm>({
    service_id: "",
    veterinarian_id: "",
    date: "",
    start_time: "",
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    pet_name: "",
    pet_species: "Perro",
    reason: "",
  });

  const set = (field: keyof BookingForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    bookingApi.getServices(slug).then(setServices).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!form.service_id) return;
    setLoading(true);
    bookingApi
      .getVets(slug, form.service_id)
      .then(setVets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, form.service_id]);

  const loadSlots = useCallback(
    (date: string) => {
      if (!form.veterinarian_id || !form.service_id || !date) return;
      setLoading(true);
      bookingApi
        .getAvailability(slug, form.veterinarian_id, date, form.service_id)
        .then(setSlots)
        .catch(() => setSlots([]))
        .finally(() => setLoading(false));
    },
    [slug, form.veterinarian_id, form.service_id]
  );

  useEffect(() => {
    if (form.date) loadSlots(form.date);
  }, [form.date, loadSlots]);

  // ── Calendar helpers ───────────────────────────────────────────────────────
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  function selectDate(day: number) {
    const d = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    set("date", d);
    set("start_time", "");
    setSlots([]);
  }

  function isPastDay(day: number) {
    const d = new Date(calYear, calMonth, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d < todayStart;
  }

  function canAdvance() {
    if (step === 1) return !!form.service_id;
    if (step === 2) return !!form.veterinarian_id;
    if (step === 3) return !!form.date && !!form.start_time;
    if (step === 4) return !!(form.guest_name && form.guest_email && form.pet_name && form.pet_species);
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      await bookingApi.book(slug, {
        veterinarian_id: form.veterinarian_id,
        service_id: form.service_id,
        date: form.date,
        start_time: form.start_time,
        guest_name: form.guest_name,
        guest_email: form.guest_email,
        guest_phone: form.guest_phone || undefined,
        pet_name: form.pet_name,
        pet_species: form.pet_species,
        reason: form.reason || undefined,
      });
      setSuccess(true);
      // Notify parent window (embed script can listen to this)
      window.parent.postMessage({ type: "fmp:booking_success", slug }, "*");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "No se pudo completar la reserva. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedService = services.find((s) => s.id === form.service_id);
  const selectedVet = vets.find((v) => v.id === form.veterinarian_id);

  // ── Success screen ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ backgroundColor: `${color}20` }}
        >
          <Check className="h-7 w-7" style={{ color }} />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">¡Reserva confirmada!</h2>
        <p className="text-sm text-gray-500">
          Te enviaremos una confirmación a <strong>{form.guest_email}</strong>
        </p>
        <div className="mt-4 w-full bg-gray-50 rounded-xl p-3 text-left space-y-1.5 text-sm">
          <InfoRow label="Servicio" value={selectedService?.name || "—"} />
          <InfoRow
            label="Veterinario"
            value={selectedVet ? `Dr/a. ${selectedVet.first_name} ${selectedVet.last_name}` : "—"}
          />
          <InfoRow label="Fecha" value={formatDate(form.date)} />
          <InfoRow label="Hora" value={form.start_time} />
        </div>
        <button
          onClick={() => window.parent.postMessage({ type: "fmp:close" }, "*")}
          className="mt-4 text-sm font-medium"
          style={{ color }}
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 font-sans">
      {/* Progress bar */}
      <div className="shrink-0 h-1 bg-gray-100">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${(step / STEPS.length) * 100}%`, backgroundColor: color }}
        />
      </div>

      {/* Step label */}
      <div className="shrink-0 px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
        {step > 1 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="p-0.5 rounded hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1">
          <p className="text-xs text-gray-400">Paso {step} de {STEPS.length}</p>
          <p className="text-sm font-semibold text-gray-900 leading-tight">{STEPS[step - 1]}</p>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* STEP 1 — Servicio */}
        {step === 1 && (
          <div className="space-y-2">
            {services.map((svc) => (
              <button
                key={svc.id}
                onClick={() => set("service_id", svc.id)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                  form.service_id === svc.id ? "border-opacity-100" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
                style={
                  form.service_id === svc.id
                    ? { borderColor: color, backgroundColor: `${color}10` }
                    : {}
                }
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{svc.name}</p>
                    {svc.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{svc.description}</p>
                    )}
                  </div>
                  {form.service_id === svc.id && (
                    <div className="h-4 w-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: color }}>
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" /> {svc.duration_minutes} min
                  </span>
                  {svc.price && (
                    <span className="text-xs font-medium" style={{ color }}>
                      ${Number(svc.price).toLocaleString("es-CL")}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* STEP 2 — Veterinario */}
        {step === 2 && (
          <div className="space-y-2">
            {loading ? (
              <Spinner color={color} />
            ) : vets.length === 0 ? (
              <p className="text-sm text-yellow-700 bg-yellow-50 rounded-lg p-3">
                No hay veterinarios disponibles para este servicio.
              </p>
            ) : (
              vets.map((vet) => (
                <button
                  key={vet.id}
                  onClick={() => { set("veterinarian_id", vet.id); set("date", ""); set("start_time", ""); }}
                  className="w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3"
                  style={
                    form.veterinarian_id === vet.id
                      ? { borderColor: color, backgroundColor: `${color}10` }
                      : { borderColor: "#e5e7eb", backgroundColor: "white" }
                  }
                >
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {vet.first_name[0]}{vet.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      Dr/a. {vet.first_name} {vet.last_name}
                    </p>
                  </div>
                  {form.veterinarian_id === vet.id && (
                    <div className="h-4 w-4 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: color }}>
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {/* STEP 3 — Fecha y hora */}
        {step === 3 && (
          <div className="space-y-3">
            {/* Mini calendar */}
            <div className="bg-white rounded-xl border border-gray-100 p-3">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => {
                    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
                    else setCalMonth(m => m - 1);
                  }}
                  className="p-1 rounded hover:bg-gray-100 text-gray-500"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-gray-800">
                  {MONTHS[calMonth]} {calYear}
                </span>
                <button
                  onClick={() => {
                    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
                    else setCalMonth(m => m + 1);
                  }}
                  className="p-1 rounded hover:bg-gray-100 text-gray-500"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map((d) => (
                  <div key={d} className="text-center text-xs text-gray-400 py-0.5">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-0.5">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const dayStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isSelected = form.date === dayStr;
                  const isPast = isPastDay(day);
                  return (
                    <button
                      key={day}
                      disabled={isPast}
                      onClick={() => selectDate(day)}
                      className="aspect-square flex items-center justify-center rounded-full text-xs mx-auto w-7 h-7 transition-all"
                      style={
                        isPast
                          ? { color: "#d1d5db", cursor: "not-allowed" }
                          : isSelected
                          ? { backgroundColor: color, color: "white", fontWeight: 600 }
                          : { color: "#374151" }
                      }
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slots */}
            {form.date && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Horarios — {formatDate(form.date)}
                </p>
                {loading ? (
                  <Spinner color={color} />
                ) : slots.length === 0 ? (
                  <p className="text-xs text-yellow-700 bg-yellow-50 rounded-lg p-2.5">
                    Sin disponibilidad este día. Prueba otra fecha.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {slots.map((slot) => (
                      <button
                        key={slot.start_time}
                        onClick={() => set("start_time", slot.start_time)}
                        className="py-1.5 rounded-lg text-xs font-medium border-2 transition-all"
                        style={
                          form.start_time === slot.start_time
                            ? { borderColor: color, backgroundColor: `${color}10`, color }
                            : { borderColor: "#e5e7eb", backgroundColor: "white", color: "#374151" }
                        }
                      >
                        {slot.start_time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 4 — Datos */}
        {step === 4 && (
          <div className="space-y-3">
            <CompactField label="Nombre completo *" value={form.guest_name}
              onChange={(v) => set("guest_name", v)} placeholder="Juan Pérez" />
            <CompactField label="Email *" value={form.guest_email} type="email"
              onChange={(v) => set("guest_email", v)} placeholder="tu@email.com" />
            <CompactField label="Teléfono" value={form.guest_phone}
              onChange={(v) => set("guest_phone", v)} placeholder="+56 9 ..." />
            <CompactField label="Nombre mascota *" value={form.pet_name}
              onChange={(v) => set("pet_name", v)} placeholder="Firulais" />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Especie *</label>
              <div className="grid grid-cols-3 gap-1.5">
                {SPECIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("pet_species", s)}
                    className="py-1.5 rounded-lg text-xs font-medium border-2 transition-all"
                    style={
                      form.pet_species === s
                        ? { borderColor: color, backgroundColor: `${color}10`, color }
                        : { borderColor: "#e5e7eb", backgroundColor: "white", color: "#4b5563" }
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Motivo</label>
              <textarea
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
                rows={2}
                className="block w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
                style={{ ["--tw-ring-color" as string]: color }}
                placeholder="Describe brevemente la visita..."
              />
            </div>
          </div>
        )}

        {/* STEP 5 — Confirmar */}
        {step === 5 && (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
              <InfoRow label="Servicio" value={selectedService?.name || "—"} />
              <InfoRow
                label="Veterinario"
                value={selectedVet ? `Dr/a. ${selectedVet.first_name} ${selectedVet.last_name}` : "—"}
              />
              <InfoRow label="Fecha" value={formatDate(form.date)} />
              <InfoRow label="Hora" value={form.start_time} />
              <hr className="border-gray-200" />
              <InfoRow label="Nombre" value={form.guest_name} />
              <InfoRow label="Email" value={form.guest_email} />
              <InfoRow label="Mascota" value={`${form.pet_name} (${form.pet_species})`} />
              {form.reason && <InfoRow label="Motivo" value={form.reason} />}
            </div>
            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2.5">{error}</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="shrink-0 px-4 pb-4 pt-2 border-t border-gray-100">
        {step < STEPS.length ? (
          <button
            disabled={!canAdvance()}
            onClick={() => setStep((s) => s + 1)}
            className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-1.5"
            style={
              canAdvance()
                ? { backgroundColor: color }
                : { backgroundColor: `${color}60`, cursor: "not-allowed" }
            }
          >
            Continuar
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            disabled={submitting}
            onClick={handleSubmit}
            className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-1.5"
            style={
              submitting
                ? { backgroundColor: "#16a34a90", cursor: "not-allowed" }
                : { backgroundColor: "#16a34a" }
            }
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Confirmar reserva
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function CompactField({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:border-primary-500"
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}

function Spinner({ color }: { color: string }) {
  return (
    <div className="flex justify-center py-4">
      <div
        className="w-5 h-5 rounded-full animate-spin border-2 border-t-transparent"
        style={{ borderColor: `${color}40`, borderTopColor: "transparent", borderRightColor: color }}
      />
    </div>
  );
}

export default function WidgetPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" /></div>}><WidgetContent /></Suspense>;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${Number(d)} de ${months[Number(m) - 1]} ${y}`;
}
