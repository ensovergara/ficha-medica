"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: "📊", permission: null },
  { label: "Clientes", href: "/dashboard/clients", icon: "👤", permission: "clients:read" },
  { label: "Pacientes", href: "/dashboard/patients", icon: "🐾", permission: "patients:read" },
  { label: "Fichas Médicas", href: "/dashboard/medical-records", icon: "📋", permission: "medical_records:read" },
  { label: "Citas", href: "/dashboard/appointments", icon: "📅", permission: "appointments:read" },
  { label: "Servicios", href: "/dashboard/services", icon: "🩺", permission: "appointments:write" },
  { label: "Horarios", href: "/dashboard/schedules", icon: "🗓️", permission: "appointments:write" },
  { label: "Inventario", href: "/dashboard/inventory", icon: "📦", permission: "inventory:read" },
  { label: "Facturación", href: "/dashboard/invoices", icon: "💰", permission: "invoices:read" },
  { label: "Reportes", href: "/dashboard/reports", icon: "📈", permission: "reports:read" },
  { label: "Auditoría", href: "/dashboard/audit-log", icon: "🔍", permission: "reports:read" },
  { label: "Usuarios", href: "/dashboard/users", icon: "👥", permission: "users:read" },
  { label: "Configuración", href: "/dashboard/settings", icon: "⚙️", permission: null },
];

const superadminItems = [
  { label: "Tenants", href: "/superadmin/tenants", icon: "🏢" },
  { label: "Suscripciones", href: "/superadmin/subscriptions", icon: "💳" },
  { label: "Planes", href: "/superadmin/plans", icon: "📋" },
];

function NavItem({ item }: { item: { label: string; href: string; icon: string } }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-100"
        )}
      >
        <span className="text-base">{item.icon}</span>
        {item.label}
      </Link>
    </li>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { can, isSuperAdmin } = usePermission();

  if (!user) return null;

  const visibleMenuItems = menuItems.filter(
    (item) => item.permission === null || can(item.permission)
  );

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col bg-white border-r border-gray-200 sticky top-0 dark:bg-slate-800 dark:border-slate-700">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6 dark:border-slate-700">
        <span className="text-2xl">🐾</span>
        <div>
          <h1 className="text-base font-bold text-primary-700 leading-tight dark:text-primary-400">FichaMédica</h1>
          <p className="text-xs text-gray-400 dark:text-slate-500">SaaS Veterinario</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-4">
        <ul className="space-y-0.5">
          {visibleMenuItems.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </ul>

        {isSuperAdmin() && (
          <div>
            <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
              SuperAdmin
            </p>
            <ul className="space-y-0.5">
              {superadminItems.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </ul>
          </div>
        )}
      </nav>

      <div className="border-t border-gray-200 p-4 dark:border-slate-700">
        <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-slate-700/50">
          <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{user.first_name} {user.last_name}</p>
          <p className="text-xs text-gray-500 capitalize dark:text-slate-400">{user.role}</p>
        </div>
        <button
          onClick={logout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:text-red-400 dark:hover:bg-red-900/20"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
