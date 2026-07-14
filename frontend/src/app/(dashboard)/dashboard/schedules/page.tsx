"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { User, VeterinarianSchedule, ScheduleException } from "@/types";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Button from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { Plus, Trash2, CalendarX } from "lucide-react";

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

interface ScheduleForm {
  veterinarian_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

interface ExceptionForm {
  veterinarian_id: string;
  exception_date: string;
  start_time: string;
  end_time: string;
  reason: string;
  full_day: boolean;
}

const emptyScheduleForm = (): ScheduleForm => ({
  veterinarian_id: "",
  day_of_week: "0",
  start_time: "09:00",
  end_time: "18:00",
});

const emptyExceptionForm = (): ExceptionForm => ({
  veterinarian_id: "",
  exception_date: new Date().toISOString().split("T")[0],
  start_time: "",
  end_time: "",
  reason: "",
  full_day: true,
});

export default function SchedulesPage() {
  const [vets, setVets] = useState<User[]>([]);
  const [selectedVetId, setSelectedVetId] = useState<string>("");
  const [schedules, setSchedules] = useState<VeterinarianSchedule[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [loading, setLoading] = useState(false);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(emptyScheduleForm());
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionForm, setExceptionForm] = useState<ExceptionForm>(emptyExceptionForm());
  const [savingException, setSavingException] = useState(false);
  const [exceptionError, setExceptionError] = useState("");

  const fetchVets = async () => {
    try {
      const { data } = await api.get("/users/");
      const vetList = data.filter((u: User) => u.role === "veterinario" && u.is_active);
      setVets(vetList);
      if (vetList.length > 0 && !selectedVetId) setSelectedVetId(vetList[0].id);
    } catch {}
  };

  const fetchForVet = async (vetId: string) => {
    if (!vetId) return;
    setLoading(true);
    try {
      const [sched, exc] = await Promise.all([
        api.get("/schedules/", { params: { veterinarian_id: vetId } }),
        api.get("/schedules/exceptions", { params: { veterinarian_id: vetId } }),
      ]);
      setSchedules(sched.data);
      setExceptions(exc.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVets(); }, []);
  useEffect(() => { if (selectedVetId) fetchForVet(selectedVetId); }, [selectedVetId]);

  const selectedVet = vets.find((v) => v.id === selectedVetId);

  function openAddSchedule() {
    setScheduleForm({ ...emptyScheduleForm(), veterinarian_id: selectedVetId });
    setScheduleError("");
    setShowScheduleModal(true);
  }

  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault();
    setScheduleError("");
    setSavingSchedule(true);
    try {
      await api.post("/schedules/", {
        veterinarian_id: scheduleForm.veterinarian_id,
        day_of_week: Number(scheduleForm.day_of_week),
        start_time: scheduleForm.start_time,
        end_time: scheduleForm.end_time,
      });
      toast.success("Horario creado");
      setShowScheduleModal(false);
      fetchForVet(selectedVetId);
    } catch (err: unknown) {
      setScheduleError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error al guardar"
      );
    } finally { setSavingSchedule(false); }
  }

  async function handleDeleteSchedule(id: string) {
    if (!confirm("¿Eliminar este horario?")) return;
    try {
      await api.delete(`/schedules/${id}`);
      toast.success("Horario eliminado");
      fetchForVet(selectedVetId);
    } catch { toast.error("No se pudo eliminar"); }
  }

  function openAddException() {
    setExceptionForm({ ...emptyExceptionForm(), veterinarian_id: selectedVetId });
    setExceptionError("");
    setShowExceptionModal(true);
  }

  async function handleSaveException(e: React.FormEvent) {
    e.preventDefault();
    setExceptionError("");
    setSavingException(true);
    const payload: Record<string, unknown> = {
      veterinarian_id: exceptionForm.veterinarian_id,
      exception_date: exceptionForm.exception_date,
      reason: exceptionForm.reason || null,
    };
    if (!exceptionForm.full_day) {
      payload.start_time = exceptionForm.start_time;
      payload.end_time = exceptionForm.end_time;
    }
    try {
      await api.post("/schedules/exceptions", payload);
      toast.success("Bloqueo creado");
      setShowExceptionModal(false);
      fetchForVet(selectedVetId);
    } catch (err: unknown) {
      setExceptionError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error al guardar"
      );
    } finally { setSavingException(false); }
  }

  async function handleDeleteException(id: string) {
    if (!confirm("¿Eliminar este bloqueo?")) return;
    try {
      await api.delete(`/schedules/exceptions/${id}`);
      toast.success("Bloqueo eliminado");
      fetchForVet(selectedVetId);
    } catch { toast.error("No se pudo eliminar"); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Horarios de veterinarios</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          Configura los días y horas de atención de cada veterinario.
        </p>
      </div>

      {/* Vet selector */}
      {vets.length === 0 ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-sm text-yellow-800 dark:text-yellow-400">
          No hay veterinarios activos. Crea usuarios con rol Veterinario en la sección Usuarios.
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {vets.map((vet) => (
            <button
              key={vet.id}
              onClick={() => setSelectedVetId(vet.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedVetId === vet.id
                  ? "bg-primary-600 text-white"
                  : "bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:border-primary-400 dark:hover:border-primary-500"
              }`}
            >
              {vet.first_name} {vet.last_name}
            </button>
          ))}
        </div>
      )}

      {selectedVet && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Horario semanal */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <h2 className="font-semibold text-gray-900 dark:text-slate-100">Horario semanal</h2>
              <Button size="sm" onClick={openAddSchedule}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar día
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-10 text-gray-400 dark:text-slate-500 text-sm">
                Sin horario configurado. Agrega los días que trabaja este veterinario.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                {[...schedules]
                  .sort((a, b) => a.day_of_week - b.day_of_week)
                  .map((s) => (
                    <li key={s.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-slate-100 text-sm">
                          {DAY_NAMES[s.day_of_week]}
                        </span>
                        <span className="ml-3 text-sm text-gray-500 dark:text-slate-400">
                          {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                        </span>
                        {!s.is_active && (
                          <span className="ml-2 text-xs text-gray-400 dark:text-slate-500">(inactivo)</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteSchedule(s.id)}
                        className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {/* Bloqueos / Excepciones */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <h2 className="font-semibold text-gray-900 dark:text-slate-100">Bloqueos y vacaciones</h2>
              <Button size="sm" variant="secondary" onClick={openAddException}>
                <CalendarX className="h-3.5 w-3.5 mr-1" /> Agregar bloqueo
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : exceptions.length === 0 ? (
              <div className="text-center py-10 text-gray-400 dark:text-slate-500 text-sm">
                Sin bloqueos registrados.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                {[...exceptions]
                  .sort((a, b) => a.exception_date.localeCompare(b.exception_date))
                  .map((exc) => (
                    <li key={exc.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-slate-100 text-sm">
                          {formatDate(exc.exception_date)}
                        </span>
                        <span className="ml-2 text-xs text-gray-500 dark:text-slate-400">
                          {exc.start_time
                            ? `${exc.start_time.slice(0, 5)} – ${exc.end_time?.slice(0, 5)}`
                            : "Día completo"}
                        </span>
                        {exc.reason && (
                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{exc.reason}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteException(exc.id)}
                        className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <Modal open={showScheduleModal} onClose={() => setShowScheduleModal(false)} title="Agregar día de atención">
        <form onSubmit={handleSaveSchedule} className="space-y-4">
          <Select
            label="Día de la semana"
            value={scheduleForm.day_of_week}
            onChange={(e) => setScheduleForm((f) => ({ ...f, day_of_week: e.target.value }))}
            options={DAY_NAMES.map((d, i) => ({ value: String(i), label: d }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Hora inicio" type="time" value={scheduleForm.start_time} onChange={(e) => setScheduleForm((f) => ({ ...f, start_time: e.target.value }))} required />
            <Input label="Hora fin" type="time" value={scheduleForm.end_time} onChange={(e) => setScheduleForm((f) => ({ ...f, end_time: e.target.value }))} required />
          </div>
          {scheduleError && <p className="text-sm text-red-600 dark:text-red-400">{scheduleError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowScheduleModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={savingSchedule}>{savingSchedule ? "Guardando..." : "Agregar"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showExceptionModal} onClose={() => setShowExceptionModal(false)} title="Agregar bloqueo">
        <form onSubmit={handleSaveException} className="space-y-4">
          <Input label="Fecha" type="date" value={exceptionForm.exception_date} onChange={(e) => setExceptionForm((f) => ({ ...f, exception_date: e.target.value }))} required />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="full_day"
              checked={exceptionForm.full_day}
              onChange={(e) => setExceptionForm((f) => ({ ...f, full_day: e.target.checked }))}
              className="rounded border-gray-300 dark:border-slate-600"
            />
            <label htmlFor="full_day" className="text-sm text-gray-700 dark:text-slate-300">Bloquear día completo</label>
          </div>
          {!exceptionForm.full_day && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Hora inicio" type="time" value={exceptionForm.start_time} onChange={(e) => setExceptionForm((f) => ({ ...f, start_time: e.target.value }))} required />
              <Input label="Hora fin" type="time" value={exceptionForm.end_time} onChange={(e) => setExceptionForm((f) => ({ ...f, end_time: e.target.value }))} required />
            </div>
          )}
          <Input label="Motivo (opcional)" value={exceptionForm.reason} onChange={(e) => setExceptionForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Vacaciones, reunión, feriado..." />
          {exceptionError && <p className="text-sm text-red-600 dark:text-red-400">{exceptionError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowExceptionModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={savingException}>{savingException ? "Guardando..." : "Agregar bloqueo"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}
