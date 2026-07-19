"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import FeatureGate from "@/components/FeatureGate";

interface SummaryReport {
  period: { from: string; to: string };
  revenue: number;
  invoices: Record<string, number>;
  consultations: number;
  new_patients: number;
  new_clients: number;
  appointments: Record<string, number>;
}

interface SpeciesData {
  species: string;
  count: number;
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [report, setReport] = useState<SummaryReport | null>(null);
  const [species, setSpecies] = useState<SpeciesData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        api.get("/reports/summary", { params: { date_from: dateFrom, date_to: dateTo } }),
        api.get("/reports/patients-by-species"),
      ]);
      setReport(r.data);
      setSpecies(s.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, []);

  const totalSpecies = species.reduce((s, d) => s + d.count, 0);

  return (
    <FeatureGate featureKey="analytics" upgradeMessage="Actualiza tu plan para acceder a reportes y análisis">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Reportes</h1>

      <div className="mt-6 flex items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Desde</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-700 dark:text-slate-200 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Hasta</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-700 dark:text-slate-200 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>
        <button onClick={fetchReports} disabled={loading} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
          {loading ? "Cargando..." : "Generar"}
        </button>
      </div>

      {report && (
        <div className="mt-8 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Ingresos", value: `$${report.revenue.toLocaleString()}`, icon: "💰" },
              { label: "Consultas", value: report.consultations, icon: "📋" },
              { label: "Nuevos pacientes", value: report.new_patients, icon: "🐾" },
              { label: "Nuevos clientes", value: report.new_clients, icon: "👤" },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{k.icon}</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">{k.value}</span>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">{k.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Invoices */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-4">Facturas por estado</h2>
              <div className="space-y-3">
                {Object.entries(report.invoices).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm capitalize text-gray-600 dark:text-slate-400">{status}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{count}</span>
                  </div>
                ))}
                {Object.keys(report.invoices).length === 0 && <p className="text-sm text-gray-400 dark:text-slate-500">Sin facturas en el período</p>}
              </div>
            </div>

            {/* Patients by species */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-4">Pacientes por especie</h2>
              <div className="space-y-3">
                {species.map((s) => (
                  <div key={s.species}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-slate-400">{s.species}</span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">{s.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700">
                      <div className="h-2 rounded-full bg-primary-500" style={{ width: `${(s.count / totalSpecies) * 100}%` }} />
                    </div>
                  </div>
                ))}
                {species.length === 0 && <p className="text-sm text-gray-400 dark:text-slate-500">Sin datos</p>}
              </div>
            </div>

            {/* Appointments */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-4">Citas por estado</h2>
              <div className="space-y-3">
                {Object.entries(report.appointments).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm capitalize text-gray-600 dark:text-slate-400">{status.replace("_", " ")}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{count}</span>
                  </div>
                ))}
                {Object.keys(report.appointments).length === 0 && <p className="text-sm text-gray-400 dark:text-slate-500">Sin citas en el período</p>}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </FeatureGate>
  );
}
