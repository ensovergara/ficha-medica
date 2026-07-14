import { useAuthStore } from "@/stores/auth-store";

const ROLE_PERMISSIONS: Record<string, Set<string>> = {
  superadmin: new Set(["*"]),
  admin: new Set([
    "tenants:read", "users:read", "users:write", "users:delete",
    "clients:read", "clients:write", "clients:delete",
    "patients:read", "patients:write", "patients:delete",
    "medical_records:read", "medical_records:write",
    "consultations:read", "consultations:write",
    "vaccinations:read", "vaccinations:write",
    "prescriptions:read", "prescriptions:write",
    "lab_results:read", "lab_results:write",
    "appointments:read", "appointments:write", "appointments:delete",
    "inventory:read", "inventory:write",
    "invoices:read", "invoices:write",
    "reports:read", "subscriptions:read",
  ]),
  veterinario: new Set([
    "clients:read", "patients:read", "patients:write",
    "medical_records:read", "medical_records:write",
    "consultations:read", "consultations:write",
    "vaccinations:read", "vaccinations:write",
    "prescriptions:read", "prescriptions:write",
    "lab_results:read", "lab_results:write",
    "appointments:read", "inventory:read",
  ]),
  recepcionista: new Set([
    "clients:read", "clients:write",
    "patients:read", "patients:write",
    "medical_records:read", "consultations:read",
    "vaccinations:read",
    "appointments:read", "appointments:write", "appointments:delete",
    "invoices:read", "invoices:write",
  ]),
  auxiliar: new Set([
    "clients:read", "patients:read", "medical_records:read",
    "consultations:read", "vaccinations:read", "vaccinations:write",
    "inventory:read", "inventory:write",
  ]),
};

export function usePermission() {
  const user = useAuthStore((s) => s.user);

  const can = (permission: string): boolean => {
    if (!user) return false;
    const perms = ROLE_PERMISSIONS[user.role];
    if (!perms) return false;
    return perms.has("*") || perms.has(permission);
  };

  const canAny = (...permissions: string[]): boolean =>
    permissions.some((p) => can(p));

  const isSuperAdmin = () => user?.role === "superadmin";
  const isAdmin = () => user?.role === "admin" || isSuperAdmin();

  return { can, canAny, isSuperAdmin, isAdmin, role: user?.role };
}
