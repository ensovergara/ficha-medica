"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import GlobalSearch from "./global-search";
import ThemeToggle from "@/components/ui/theme-toggle";
import MobileMenu from "./mobile-menu";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";
import api from "@/lib/api";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/clients": "Clientes",
  "/dashboard/patients": "Pacientes",
  "/dashboard/medical-records": "Fichas Médicas",
  "/dashboard/appointments": "Citas",
  "/dashboard/inventory": "Inventario",
  "/dashboard/invoices": "Facturación",
  "/dashboard/reports": "Reportes",
  "/dashboard/users": "Usuarios",
  "/dashboard/settings": "Configuración",
  "/dashboard/audit-log": "Auditoría",
  "/superadmin/tenants": "Tenants",
  "/superadmin/subscriptions": "Suscripciones",
  "/superadmin/plans": "Planes",
};

interface Tenant { id: string; name: string; }

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { selectedTenantId, setSelectedTenantId } = useTenantStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    if (user?.role === "superadmin") {
      api.get("/tenants/").then(({ data }) => setTenants(data)).catch(() => {});
    }
  }, [user?.role]);

  const getTitle = () => {
    for (const [path, title] of Object.entries(titles)) {
      if (pathname === path || pathname.startsWith(path + "/")) return title;
    }
    return "Panel";
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6 lg:px-8 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-3 flex-1 md:flex-initial">
        <MobileMenu />
        <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">{getTitle()}</h2>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {user?.role === "superadmin" && tenants.length > 0 && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-slate-400">Clínica:</span>
            <select
              value={selectedTenantId || ""}
              onChange={(e) => setSelectedTenantId(e.target.value || null)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs md:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              <option value="">Todas las clínicas</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
        {user?.role !== "superadmin" && <div className="hidden md:block"><GlobalSearch /></div>}
        <ThemeToggle />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs md:text-sm font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-400">
          {user?.first_name?.[0]}{user?.last_name?.[0]}
        </div>
      </div>
    </header>
  );
}
