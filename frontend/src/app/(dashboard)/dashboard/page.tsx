"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { usePermission } from "@/hooks/usePermission";
import api from "@/lib/api";

interface Stats {
  patients_total: number;
  clients_total: number;
  appointments_today: number;
  appointments_pending: number;
  low_stock_count: number;
  revenue_month: number;
  patients_month: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { isSuperAdmin, can } = usePermission();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const superadmin = isSuperAdmin();

  useEffect(() => {
    api.get("/stats/dashboard")
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allCards = stats
    ? [
        { label: superadmin ? "Total pacientes" : "Pacientes activos", value: stats.patients_total, sub: `+${stats.patients_month} este mes`, icon: "🐾", color: "bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800", text: "text-blue-700 dark:text-blue-400", href: "/dashboard/patients", permission: "patients:read" },
        { label: superadmin ? "Total clientes" : "Clientes", value: stats.clients_total, sub: "propietarios registrados", icon: "👤", color: "bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800", text: "text-green-700 dark:text-green-400", href: "/dashboard/clients", permission: "clients:read" },
        { label: "Citas hoy", value: stats.appointments_today, sub: `${stats.appointments_pending} pendientes`, icon: "📅", color: "bg-purple-50 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800", text: "text-purple-700 dark:text-purple-400", href: "/dashboard/appointments", permission: "appointments:read" },
        { label: superadmin ? "Ingresos globales" : "Ingresos del mes", value: `$${stats.revenue_month.toLocaleString()}`, sub: "facturas pagadas", icon: "💰", color: "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-400", href: "/dashboard/invoices", permission: "invoices:read" },
        { label: "Stock bajo", value: stats.low_stock_count, sub: "productos bajo mínimo", icon: "⚠️", color: stats.low_stock_count > 0 ? "bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800" : "bg-gray-50 border-gray-100 dark:bg-slate-800 dark:border-slate-700", text: stats.low_stock_count > 0 ? "text-orange-700 dark:text-orange-400" : "text-gray-700 dark:text-slate-300", href: "/dashboard/inventory", permission: "inventory:read" },
      ]
    : [];

  const cards = allCards.filter((c) => can(c.permission));

  const quickActions = [
    { label: "Nueva cita", href: "/dashboard/appointments", icon: "📅", permission: "appointments:write" },
    { label: "Nuevo paciente", href: "/dashboard/patients", icon: "🐾", permission: "patients:write" },
    { label: "Nueva consulta", href: "/dashboard/medical-records", icon: "📋", permission: "medical_records:write" },
    { label: "Nueva factura", href: "/dashboard/invoices", icon: "💰", permission: "invoices:write" },
  ].filter((a) => can(a.permission));

  const superadminLinks = [
    { label: "Gestionar Tenants", href: "/superadmin/tenants", icon: "🏢", desc: "Clínicas registradas" },
    { label: "Suscripciones", href: "/superadmin/subscriptions", icon: "💳", desc: "Estado de planes" },
    { label: "Planes", href: "/superadmin/plans", icon: "📋", desc: "Configurar precios" },
  ];

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0 mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-100">
            Hola, {user?.first_name} 👋
            {superadmin && <span className="mt-2 md:ml-2 md:mt-0 inline-block rounded-full bg-primary-100 dark:bg-primary-900/30 px-2 py-0.5 text-xs md:text-sm font-medium text-primary-700 dark:text-primary-400">SuperAdmin</span>}
          </h1>
          <p className="mt-1 text-sm md:text-base text-gray-500 dark:text-slate-400">
            {superadmin ? "Vista global de toda la plataforma" : "Resumen de tu clínica"}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 sm:h-28 rounded-xl border bg-gray-50 dark:bg-slate-800 dark:border-slate-700 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 ${cards.length >= 4 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
          {cards.map((card) => (
            <Link key={card.label} href={card.href} className={`rounded-xl border p-4 md:p-5 ${card.color} hover:shadow-sm transition-shadow`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xl md:text-2xl">{card.icon}</span>
                <span className={`text-xl md:text-2xl font-bold ${card.text}`}>{card.value}</span>
              </div>
              <p className={`mt-2 text-xs md:text-sm font-medium ${card.text}`}>{card.label}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{card.sub}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 md:mt-8 grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        {/* Quick actions */}
        {quickActions.length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 md:p-6">
            <h2 className="text-sm md:text-base font-semibold text-gray-900 dark:text-slate-100 mb-4">Acciones rápidas</h2>
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 rounded-lg border border-gray-200 dark:border-slate-700 p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <span className="text-lg md:text-xl">{action.icon}</span>
                  <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-slate-300 line-clamp-1">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* SuperAdmin panel / Subscription info */}
        {superadmin ? (
          <div className="rounded-xl border border-primary-100 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 p-4 md:p-6">
            <h2 className="text-sm md:text-base font-semibold text-primary-800 dark:text-primary-300 mb-4">Panel SuperAdmin</h2>
            <div className="space-y-2">
              {superadminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between rounded-lg border border-primary-200 dark:border-primary-700 bg-white dark:bg-slate-800 px-3 md:px-4 py-2.5 md:py-3 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors gap-2"
                >
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <span className="text-lg md:text-xl flex-shrink-0">{link.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs md:text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{link.label}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{link.desc}</p>
                    </div>
                  </div>
                  <span className="text-gray-400 dark:text-slate-500 text-xs md:text-sm flex-shrink-0">&rarr;</span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 md:p-6">
            <h2 className="text-sm md:text-base font-semibold text-gray-900 dark:text-slate-100 mb-4">Tu suscripción</h2>
            <SubscriptionInfo patientsTotal={stats?.patients_total ?? 0} />
          </div>
        )}
      </div>
    </div>
  );
}

function SubscriptionInfo({ patientsTotal }: { patientsTotal: number }) {
  const [sub, setSub] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.get("/subscriptions/my-subscription/").catch(() => null),
      api.get("/subscriptions/plans/").catch(() => ({ data: [] })),
    ]).then(([s, p]) => {
      if (s) setSub(s.data);
      const plans = p?.data || [];
      if (s && plans.length) {
        const found = plans.find((pl: any) => pl.id === s.data.plan_id);
        setPlan(found);
      }
    });
  }, []);

  if (!sub || !plan) return <p className="text-sm text-gray-400 dark:text-slate-500">Cargando...</p>;

  const statusColors: Record<string, string> = { trial: "text-blue-600 dark:text-blue-400", active: "text-green-600 dark:text-green-400", past_due: "text-orange-600 dark:text-orange-400", cancelled: "text-red-600 dark:text-red-400" };
  const statusLabels: Record<string, string> = { trial: "Período de prueba", active: "Activo", past_due: "Pago vencido", cancelled: "Cancelado" };
  const pctPatients = plan.max_patients ? Math.min(100, (patientsTotal / plan.max_patients) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-sm md:text-base font-semibold text-gray-900 dark:text-slate-100">{plan.name}</p>
          <p className={`text-xs md:text-sm font-medium ${statusColors[sub.status] || "text-gray-600 dark:text-slate-400"}`}>{statusLabels[sub.status] || sub.status}</p>
        </div>
        {sub.current_period_end && (
          <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 flex-shrink-0">Vence: {new Date(sub.current_period_end).toLocaleDateString("es-CL")}</p>
        )}
      </div>

      {plan.max_patients && (
        <div>
          <div className="flex justify-between text-xs md:text-sm text-gray-600 dark:text-slate-400 mb-1">
            <span>Pacientes</span>
            <span>{patientsTotal} / {plan.max_patients}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700">
            <div
              className={`h-2 rounded-full transition-all ${pctPatients > 90 ? "bg-red-500" : pctPatients > 70 ? "bg-orange-400" : "bg-primary-500"}`}
              style={{ width: `${pctPatients}%` }}
            />
          </div>
        </div>
      )}

      <Link href="/dashboard/settings" className="block text-xs md:text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
        Ver planes disponibles &rarr;
      </Link>
    </div>
  );
}
