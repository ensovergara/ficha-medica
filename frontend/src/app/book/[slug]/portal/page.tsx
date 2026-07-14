"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { bookingApi, savePortalToken, getPortalToken, clearPortalToken } from "@/lib/public-api";
import { PublicAppointment } from "@/types";
import { Calendar, Clock, ChevronLeft, LogOut, X, Mail, CheckCircle } from "lucide-react";

type View = "login" | "check-email" | "appointments";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  scheduled:   { label: "Agendada",    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  confirmed:   { label: "Confirmada",  className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  in_progress: { label: "En curso",    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  completed:   { label: "Completada",  className: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400" },
  cancelled:   { label: "Cancelada",   className: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
};

export default function ClientPortalPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [loadingMagic, setLoadingMagic] = useState(false);
  const [appointments, setAppointments] = useState<PublicAppointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState("");

  // On mount: check for token param (magic link redirect) or existing session
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      handleVerifyToken(token);
      return;
    }
    if (getPortalToken()) {
      setView("appointments");
      loadAppointments();
    }
  }, []);

  async function handleVerifyToken(token: string) {
    try {
      const data = await bookingApi.verifyMagicLink(slug, token);
      savePortalToken(data.access_token, data.client_id);
      setView("appointments");
      loadAppointments();
      // Clean token from URL without reload
      window.history.replaceState({}, "", `/book/${slug}/portal`);
    } catch {
      setView("login");
    }
  }

  async function handleRequestLink() {
    if (!email) return;
    setLoadingMagic(true);
    try {
      await bookingApi.requestMagicLink(slug, email);
      setView("check-email");
    } catch {
      // Always show check-email to avoid email enumeration
      setView("check-email");
    } finally {
      setLoadingMagic(false);
    }
  }

  async function loadAppointments() {
    setLoadingAppts(true);
    try {
      const data = await bookingApi.getMyAppointments(slug);
      setAppointments(data);
    } catch {
      clearPortalToken();
      setView("login");
    } finally {
      setLoadingAppts(false);
    }
  }

  async function handleCancel(id: string) {
    setCancellingId(id);
    setCancelError("");
    try {
      await bookingApi.cancelAppointment(slug, id);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a))
      );
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setCancelError(msg || "No se pudo cancelar la cita.");
    } finally {
      setCancellingId(null);
    }
  }

  function handleLogout() {
    clearPortalToken();
    setView("login");
    setAppointments([]);
  }

  // ─── Login view ──────────────────────────────────────────────────────────
  if (view === "login") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
        <header className="bg-white dark:bg-slate-800 shadow-sm dark:shadow-slate-900/50 border-b border-transparent dark:border-slate-700">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => router.push(`/book/${slug}`)}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-slate-400" />
            </button>
            <span className="font-semibold text-gray-900 dark:text-slate-100">Mi portal</span>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-transparent dark:border-slate-700 p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/40 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail className="h-7 w-7 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Accede a tus citas</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                Te enviaremos un enlace de acceso a tu email. Sin contraseñas.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Tu email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRequestLink()}
                  placeholder="tu@email.com"
                  className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 dark:placeholder-slate-500"
                />
              </div>
              <button
                onClick={handleRequestLink}
                disabled={!email || loadingMagic}
                className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:bg-primary-200 dark:disabled:bg-primary-900/30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loadingMagic ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Enviar enlace de acceso"
                )}
              </button>
            </div>

            <p className="text-xs text-center text-gray-400 dark:text-slate-500 mt-6">
              ¿Quieres reservar una cita?{" "}
              <button onClick={() => router.push(`/book/${slug}/book`)}
                className="text-primary-600 dark:text-primary-400 hover:underline">
                Agendar aquí
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Check email view ────────────────────────────────────────────────────
  if (view === "check-email") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-transparent dark:border-slate-700 p-8 text-center">
          <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">Revisa tu email</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
            Si el email <strong className="text-gray-700 dark:text-slate-300">{email}</strong> está registrado, recibirás un enlace
            de acceso en los próximos minutos. El enlace expira en 30 minutos.
          </p>
          <button
            onClick={() => setView("login")}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  // ─── Appointments view ───────────────────────────────────────────────────
  const upcomingAppts = appointments.filter(
    (a) => a.status !== "cancelled" && a.status !== "completed" && a.date >= new Date().toISOString().split("T")[0]
  );
  const pastAppts = appointments.filter(
    (a) => a.status === "completed" || a.status === "cancelled" || a.date < new Date().toISOString().split("T")[0]
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 shadow-sm dark:shadow-slate-900/50 border-b border-transparent dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/book/${slug}`)}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-slate-400" />
            </button>
            <span className="font-semibold text-gray-900 dark:text-slate-100">Mis citas</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {cancelError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
            {cancelError}
          </div>
        )}

        {loadingAppts ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-slate-400">No tienes citas registradas.</p>
            <button
              onClick={() => router.push(`/book/${slug}/book`)}
              className="mt-4 bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              Agendar una cita
            </button>
          </div>
        ) : (
          <>
            {upcomingAppts.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Próximas citas</h3>
                <div className="space-y-3">
                  {upcomingAppts.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appt={appt}
                      onCancel={handleCancel}
                      cancelling={cancellingId === appt.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {pastAppts.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Historial</h3>
                <div className="space-y-3">
                  {pastAppts.map((appt) => (
                    <AppointmentCard key={appt.id} appt={appt} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <div className="text-center pt-2">
          <button
            onClick={() => router.push(`/book/${slug}/book`)}
            className="bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            + Agendar nueva cita
          </button>
        </div>
      </main>
    </div>
  );
}

// ─── AppointmentCard ──────────────────────────────────────────────────────────

function AppointmentCard({
  appt,
  onCancel,
  cancelling,
}: {
  appt: PublicAppointment;
  onCancel?: (id: string) => void;
  cancelling?: boolean;
}) {
  const status = STATUS_MAP[appt.status] ?? { label: appt.status, className: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400" };
  const isCancellable = onCancel && !["cancelled", "completed"].includes(appt.status);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-transparent dark:border-slate-700 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900 dark:text-slate-100">{appt.pet_name}</p>
          {appt.service_name && <p className="text-sm text-gray-500 dark:text-slate-400">{appt.service_name}</p>}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
          {formatDate(appt.date)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
          {appt.start_time}{appt.end_time ? ` - ${appt.end_time}` : ""}
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-slate-400">Dr/a. {appt.vet_name}</p>

      {isCancellable && (
        <button
          onClick={() => onCancel(appt.id)}
          disabled={cancelling}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors disabled:opacity-50 mt-1"
        >
          <X className="h-3.5 w-3.5" />
          {cancelling ? "Cancelando..." : "Cancelar cita"}
        </button>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}
