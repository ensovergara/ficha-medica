"use client";

import type { Appointment } from "@/types";

interface Props {
  appointments: Appointment[];
  year: number;
  month: number;
  onNavigate: (year: number, month: number) => void;
  getPatientName: (id: string) => string;
  statusColors: Record<string, string>;
  onClickAppointment?: (appt: Appointment) => void;
}

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function AppointmentCalendar({ appointments, year, month, onNavigate, getPatientName, statusColors, onClickAppointment }: Props) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const aptsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return appointments.filter((a) => a.date === dateStr);
  };

  const today = new Date();
  const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
        <button
          onClick={() => { const d = new Date(year, month - 1, 1); onNavigate(d.getFullYear(), d.getMonth()); }}
          className="rounded-lg p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
        >
          ←
        </button>
        <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">{MONTHS[month]} {year}</h3>
        <button
          onClick={() => { const d = new Date(year, month + 1, 1); onNavigate(d.getFullYear(), d.getMonth()); }}
          className="rounded-lg p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
        >
          →
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-slate-700">
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-400 dark:text-slate-500">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => (
          <div
            key={idx}
            className={`min-h-[88px] p-1.5 border-b border-r border-gray-100 dark:border-slate-700 ${!day ? "bg-gray-50 dark:bg-slate-900/50" : ""}`}
          >
            {day && (
              <>
                <span className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${isToday(day) ? "bg-primary-600 text-white" : "text-gray-700 dark:text-slate-300"}`}>
                  {day}
                </span>
                <div className="space-y-0.5">
                  {aptsForDay(day).slice(0, 3).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => onClickAppointment?.(a)}
                      title={`${a.start_time} — ${getPatientName(a.patient_id)}`}
                      className={`w-full text-left truncate rounded px-1 py-0.5 text-xs font-medium text-white ${statusColors[a.status] || "bg-gray-400"} ${onClickAppointment ? "hover:opacity-80 cursor-pointer" : "cursor-default"}`}
                    >
                      {a.start_time?.slice(0, 5)} {getPatientName(a.patient_id)}
                    </button>
                  ))}
                  {aptsForDay(day).length > 3 && (
                    <p className="text-xs text-gray-400 dark:text-slate-500 pl-1">+{aptsForDay(day).length - 3} más</p>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
