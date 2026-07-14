"use client";

import type { Appointment } from "@/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  appointments: Appointment[];
  weekStart: Date;           // Monday of the week
  onNavigate: (dir: 1 | -1) => void;
  getPatientName: (id: string) => string;
  getVetName: (id: string) => string;
  getServiceName: (id?: string) => string | null;
  statusColors: Record<string, string>;
  onClickAppointment?: (appt: Appointment) => void;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 – 20:00
const DAY_NAMES_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS_SHORT = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const SLOT_HEIGHT = 56; // px per hour

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function dateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function AppointmentWeekView({
  appointments, weekStart, onNavigate,
  getPatientName, getVetName, getServiceName, statusColors, onClickAppointment,
}: Props) {
  const today = new Date();
  const todayStr = dateStr(today);

  // Build 7-day columns starting from weekStart (Monday)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const weekEndDate = days[6];
  const weekLabel =
    weekStart.getMonth() === weekEndDate.getMonth()
      ? `${weekStart.getDate()} – ${weekEndDate.getDate()} ${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getFullYear()}`
      : `${weekStart.getDate()} ${MONTHS_SHORT[weekStart.getMonth()]} – ${weekEndDate.getDate()} ${MONTHS_SHORT[weekEndDate.getMonth()]} ${weekStart.getFullYear()}`;

  // Map appointments to their day column
  const apptsByDay: Record<string, (Appointment & { service_id?: string })[]> = {};
  for (const appt of appointments) {
    if (!apptsByDay[appt.date]) apptsByDay[appt.date] = [];
    apptsByDay[appt.date].push(appt as Appointment & { service_id?: string });
  }

  // Calculate top offset and height for an appointment block
  function getBlockStyle(appt: Appointment & { service_id?: string }) {
    const startMin = timeToMinutes(appt.start_time);
    const endMin = appt.end_time ? timeToMinutes(appt.end_time) : startMin + 30;
    const gridStart = 8 * 60; // 08:00
    const top = ((startMin - gridStart) / 60) * SLOT_HEIGHT;
    const height = Math.max(((endMin - startMin) / 60) * SLOT_HEIGHT, 24);
    return { top, height };
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <button onClick={() => onNavigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{weekLabel}</span>
        <button onClick={() => onNavigate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="flex overflow-x-auto">
        {/* Hour labels column */}
        <div className="shrink-0 w-14 border-r border-gray-100 dark:border-slate-700">
          {/* Empty header cell */}
          <div className="h-10 border-b border-gray-100 dark:border-slate-700" />
          {HOURS.map((h) => (
            <div
              key={h}
              className="flex items-start justify-end pr-2 text-xs text-gray-400 dark:text-slate-500"
              style={{ height: SLOT_HEIGHT }}
            >
              <span className="-mt-2">{pad(h)}:00</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const ds = dateStr(day);
          const isToday = ds === todayStr;
          const dayAppts = (apptsByDay[ds] || []).sort(
            (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
          );

          return (
            <div key={ds} className="flex-1 min-w-[100px] border-r border-gray-100 dark:border-slate-700 last:border-r-0">
              {/* Day header */}
              <div className={`h-10 border-b border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center ${isToday ? "bg-primary-50 dark:bg-primary-900/20" : ""}`}>
                <span className="text-xs text-gray-400 dark:text-slate-500">{DAY_NAMES_SHORT[days.indexOf(day)]}</span>
                <span className={`text-sm font-semibold leading-none ${isToday ? "text-primary-600 dark:text-primary-400" : "text-gray-800 dark:text-slate-200"}`}>
                  {day.getDate()}
                </span>
              </div>

              {/* Hour grid + appointments */}
              <div className="relative" style={{ height: HOURS.length * SLOT_HEIGHT }}>
                {/* Hour lines */}
                {HOURS.map((h, i) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-gray-100 dark:border-slate-700"
                    style={{ top: i * SLOT_HEIGHT }}
                  />
                ))}

                {/* Current time indicator */}
                {isToday && (() => {
                  const now = new Date();
                  const nowMin = now.getHours() * 60 + now.getMinutes();
                  const gridStart = 8 * 60;
                  if (nowMin >= gridStart && nowMin <= (gridStart + HOURS.length * 60)) {
                    const top = ((nowMin - gridStart) / 60) * SLOT_HEIGHT;
                    return (
                      <div className="absolute inset-x-0 flex items-center z-10" style={{ top }}>
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
                        <div className="flex-1 border-t-2 border-red-500" />
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Appointment blocks */}
                {dayAppts.map((appt) => {
                  const { top, height } = getBlockStyle(appt);
                  const colorClass = statusColors[appt.status] || "bg-gray-400";
                  const serviceName = getServiceName(appt.service_id);
                  return (
                    <button
                      key={appt.id}
                      onClick={() => onClickAppointment?.(appt)}
                      title={`${appt.start_time?.slice(0, 5)} ${getPatientName(appt.patient_id)}${serviceName ? ` — ${serviceName}` : ""}`}
                      className={`absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-left text-white text-xs leading-tight overflow-hidden ${colorClass} hover:opacity-90 hover:shadow-md transition-all cursor-pointer`}
                      style={{ top, height }}
                    >
                      <p className="font-semibold truncate">{appt.start_time?.slice(0, 5)}</p>
                      <p className="truncate opacity-90">{getPatientName(appt.patient_id)}</p>
                      {height >= 44 && serviceName && (
                        <p className="truncate opacity-75">{serviceName}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
