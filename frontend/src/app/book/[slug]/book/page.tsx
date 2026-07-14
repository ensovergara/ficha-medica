"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { bookingApi } from "@/lib/public-api";
import { Service, PublicVet, AvailableSlot } from "@/types";
import { ChevronLeft, ChevronRight, Check, Clock, Calendar, User, PawPrint, ClipboardList } from "lucide-react";

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
  pet_age_years: string;
  reason: string;
}

const STEPS = [
  { id: 1, label: "Servicio", icon: ClipboardList },
  { id: 2, label: "Veterinario", icon: User },
  { id: 3, label: "Fecha y hora", icon: Calendar },
  { id: 4, label: "Tus datos", icon: PawPrint },
  { id: 5, label: "Confirmar", icon: Check },
];

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const SPECIES = ["Perro", "Gato", "Ave", "Conejo", "Reptil", "Otro"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookingWizardPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [vets, setVets] = useState<PublicVet[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Calendar state
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const [form, setForm] = useState<BookingForm>({
    service_id: searchParams.get("service_id") || "",
    veterinarian_id: "",
    date: "",
    start_time: "",
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    pet_name: "",
    pet_species: "Perro",
    pet_age_years: "",
    reason: "",
  });

  const set = (field: keyof BookingForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Load services
  useEffect(() => {
    bookingApi.getServices(slug).then(setServices).catch(() => {});
    // Skip to step 2 if service_id provided in URL
    if (searchParams.get("service_id")) setStep(2);
  }, [slug, searchParams]);

  // Load vets when service changes
  useEffect(() => {
    if (!form.service_id) return;
    setLoading(true);
    bookingApi
      .getVets(slug, form.service_id)
      .then(setVets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, form.service_id]);

  // Load slots when date+vet+service are ready
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

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  }

  function isPastDay(day: number) {
    const d = new Date(calYear, calMonth, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d < todayStart;
  }

  // ── Validation per step ────────────────────────────────────────────────────
  function canAdvance(): boolean {
    if (step === 1) return !!form.service_id;
    if (step === 2) return !!form.veterinarian_id;
    if (step === 3) return !!form.date && !!form.start_time;
    if (step === 4) return !!(form.guest_name && form.guest_email && form.pet_name && form.pet_species);
    return true;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
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
        pet_age_years: form.pet_age_years ? Number(form.pet_age_years) : undefined,
        reason: form.reason || undefined,
      });
      setSuccess(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "No se pudo completar la reserva. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Success screen ────────────────────────────────────────────────────────
  if (success) {
    const selectedService = services.find((s) => s.id === form.service_id);
    const selectedVet = vets.find((v) => v.id === form.veterinarian_id);
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-lg dark:shadow-slate-900/50 border border-transparent dark:border-slate-700 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">¡Cita agendada!</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">
            Te enviaremos una confirmación a {form.guest_email}
          </p>
          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 text-left space-y-2 text-sm mb-6">
            <Row label="Servicio" value={selectedService?.name || "—"} />
            <Row label="Veterinario" value={selectedVet ? `${selectedVet.first_name} ${selectedVet.last_name}` : "—"} />
            <Row label="Fecha" value={formatDate(form.date)} />
            <Row label="Hora" value={form.start_time} />
            <Row label="Mascota" value={`${form.pet_name} (${form.pet_species})`} />
          </div>
          <button
            onClick={() => router.push(`/book/${slug}`)}
            className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const selectedService = services.find((s) => s.id === form.service_id);
  const selectedVet = vets.find((v) => v.id === form.veterinarian_id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm dark:shadow-slate-900/50 border-b border-transparent dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : router.push(`/book/${slug}`)}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-slate-400" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-gray-500 dark:text-slate-400">Paso {step} de {STEPS.length}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{STEPS[step - 1].label}</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-slate-700">
          <div
            className="h-full bg-primary-600 transition-all duration-300"
            style={{ width: `${(step / STEPS.length) * 100}%` }}
          />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* ── STEP 1: Servicio ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">¿Qué servicio necesitas?</h2>
            {services.map((svc) => (
              <button
                key={svc.id}
                onClick={() => { set("service_id", svc.id); set("veterinarian_id", ""); }}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  form.service_id === svc.id
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                    : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-slate-100">{svc.name}</p>
                    {svc.description && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{svc.description}</p>}
                  </div>
                  {form.service_id === svc.id && (
                    <div className="h-5 w-5 rounded-full bg-primary-500 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5" /> {svc.duration_minutes} min
                  </span>
                  {svc.price && (
                    <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                      ${Number(svc.price).toLocaleString("es-CL")}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── STEP 2: Veterinario ──────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Elige tu veterinario</h2>
            {loading ? (
              <Spinner />
            ) : vets.length === 0 ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-sm text-yellow-800 dark:text-yellow-400">
                No hay veterinarios disponibles para este servicio.
              </div>
            ) : (
              vets.map((vet) => (
                <button
                  key={vet.id}
                  onClick={() => { set("veterinarian_id", vet.id); set("date", ""); set("start_time", ""); }}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    form.veterinarian_id === vet.id
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500"
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold shrink-0">
                    {vet.first_name[0]}{vet.last_name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-slate-100">
                      Dr/a. {vet.first_name} {vet.last_name}
                    </p>
                  </div>
                  {form.veterinarian_id === vet.id && (
                    <div className="h-5 w-5 rounded-full bg-primary-500 flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {/* ── STEP 3: Fecha y hora ─────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Elige fecha y hora</h2>

            {/* Calendar */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-transparent dark:border-slate-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700">
                  <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-slate-400" />
                </button>
                <span className="font-semibold text-gray-900 dark:text-slate-100">
                  {MONTHS[calMonth]} {calYear}
                </span>
                <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700">
                  <ChevronRight className="h-5 w-5 text-gray-600 dark:text-slate-400" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-slate-500 py-1">{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-y-1">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const dayStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isSelected = form.date === dayStr;
                  const isPast = isPastDay(day);
                  return (
                    <button
                      key={day}
                      disabled={isPast}
                      onClick={() => selectDate(day)}
                      className={`aspect-square flex items-center justify-center rounded-full text-sm transition-all mx-auto w-9 h-9 ${
                        isPast
                          ? "text-gray-300 dark:text-slate-700 cursor-not-allowed"
                          : isSelected
                          ? "bg-primary-600 text-white font-semibold"
                          : "hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-700 dark:text-slate-300"
                      }`}
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
                <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Horarios disponibles — {formatDate(form.date)}
                </p>
                {loading ? (
                  <Spinner />
                ) : slots.length === 0 ? (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 text-sm text-yellow-800 dark:text-yellow-400">
                    No hay horarios disponibles este día. Prueba con otra fecha.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.start_time}
                        onClick={() => set("start_time", slot.start_time)}
                        className={`py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                          form.start_time === slot.start_time
                            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                            : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-500"
                        }`}
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

        {/* ── STEP 4: Datos del cliente y mascota ──────────────────────────── */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Tus datos y tu mascota</h2>

            <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-transparent dark:border-slate-700 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Datos de contacto</h3>
              <Field label="Nombre completo *" value={form.guest_name}
                onChange={(v) => set("guest_name", v)} placeholder="Juan Pérez" />
              <Field label="Email *" value={form.guest_email} type="email"
                onChange={(v) => set("guest_email", v)} placeholder="tu@email.com" />
              <Field label="Teléfono" value={form.guest_phone}
                onChange={(v) => set("guest_phone", v)} placeholder="+56 9 1234 5678" />
            </section>

            <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-transparent dark:border-slate-700 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Tu mascota</h3>
              <Field label="Nombre de la mascota *" value={form.pet_name}
                onChange={(v) => set("pet_name", v)} placeholder="Firulais" />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Especie *</label>
                <div className="grid grid-cols-3 gap-2">
                  {SPECIES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set("pet_species", s)}
                      className={`py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                        form.pet_species === s
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                          : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-500"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Edad (años)" value={form.pet_age_years} type="number"
                onChange={(v) => set("pet_age_years", v)} placeholder="3" />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Motivo de consulta</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => set("reason", e.target.value)}
                  rows={3}
                  className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 dark:placeholder-slate-500"
                  placeholder="Describe brevemente el motivo de la visita..."
                />
              </div>
            </section>
          </div>
        )}

        {/* ── STEP 5: Confirmar ────────────────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Confirma tu reserva</h2>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-transparent dark:border-slate-700 p-5 space-y-3 text-sm">
              <Row label="Servicio" value={selectedService?.name || "—"} />
              <Row label="Veterinario"
                value={selectedVet ? `Dr/a. ${selectedVet.first_name} ${selectedVet.last_name}` : "—"} />
              <Row label="Fecha" value={formatDate(form.date)} />
              <Row label="Hora" value={form.start_time} />
              {selectedService?.duration_minutes && (
                <Row label="Duración" value={`${selectedService.duration_minutes} min`} />
              )}
              <hr className="border-gray-100 dark:border-slate-700" />
              <Row label="Nombre" value={form.guest_name} />
              <Row label="Email" value={form.guest_email} />
              {form.guest_phone && <Row label="Teléfono" value={form.guest_phone} />}
              <hr className="border-gray-100 dark:border-slate-700" />
              <Row label="Mascota" value={`${form.pet_name} (${form.pet_species}${form.pet_age_years ? `, ${form.pet_age_years} años` : ""})`} />
              {form.reason && <Row label="Motivo" value={form.reason} />}
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── Navigation buttons ────────────────────────────────────────────── */}
        <div className="mt-6 flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 py-2.5 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Atrás
            </button>
          )}
          {step < STEPS.length ? (
            <button
              disabled={!canAdvance()}
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:bg-primary-200 dark:disabled:bg-primary-900/30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              Continuar
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              disabled={submitting}
              onClick={handleSubmit}
              className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
      </main>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 dark:placeholder-slate-500"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-gray-900 dark:text-slate-100 text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-6">
      <div className="w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${Number(d)} de ${months[Number(m) - 1]} ${y}`;
}
