"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { usePermission } from "@/hooks/usePermission";
import api from "@/lib/api";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { Tenant } from "@/types";
import { Copy, Check, ExternalLink, Globe, Code } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { isSuperAdmin, can } = usePermission();
  const router = useRouter();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(true);

  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const [copied, setCopied] = useState<"url" | "embed" | null>(null);

  useEffect(() => {
    if (!isSuperAdmin() && user?.tenant_id) {
      api.get("/tenants/me")
        .then((r) => setTenant(r.data))
        .catch(() => {})
        .finally(() => setLoadingTenant(false));
    } else {
      setLoadingTenant(false);
    }
  }, [user]);

  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

  const portalUrl = tenant ? `${baseUrl}/book/${tenant.slug}` : null;

  const embedCode = tenant
    ? `<script src="${baseUrl}/embed.js" data-clinic="${tenant.slug}" data-color="#0d9488"></script>`
    : null;

  function copyToClipboard(text: string, type: "url" | "embed") {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (pwForm.new_password !== pwForm.confirm) { setPwError("Las contraseñas no coinciden."); return; }
    if (pwForm.new_password.length < 8) { setPwError("La nueva contraseña debe tener al menos 8 caracteres."); return; }
    setPwSaving(true);
    try {
      await api.post("/auth/change-password", {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwSuccess("Contraseña actualizada correctamente.");
      setPwForm({ current_password: "", new_password: "", confirm: "" });
    } catch (err: unknown) {
      setPwError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error al cambiar la contraseña.");
    } finally { setPwSaving(false); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Configuración</h1>

      <div className="mt-6 max-w-2xl space-y-6">

        {/* Profile info */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Perfil</h2>
          <div className="mt-4 space-y-3">
            <Row label="Nombre" value={`${user?.first_name} ${user?.last_name}`} />
            <Row label="Email" value={user?.email || ""} />
            <Row label="Rol" value={user?.role || ""} className="capitalize" />
          </div>
        </div>

        {/* Portal público */}
        {!isSuperAdmin() && can("appointments:read") && (
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Portal de reservas</h2>
            </div>

            {loadingTenant ? (
              <p className="text-sm text-gray-400 dark:text-slate-500">Cargando…</p>
            ) : !tenant ? (
              <p className="text-sm text-gray-400 dark:text-slate-500">No se pudo cargar la información de la clínica.</p>
            ) : (
              <>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Comparte esta URL con tus clientes para que puedan reservar horas directamente en línea.
                </p>

                {/* Portal URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    URL del portal
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-2 text-sm text-gray-700 dark:text-slate-200 font-mono truncate">
                      {portalUrl}
                    </div>
                    <button
                      onClick={() => copyToClipboard(portalUrl!, "url")}
                      title="Copiar URL"
                      className="shrink-0 p-2 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-500 dark:text-slate-400"
                    >
                      {copied === "url" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <a
                      href={portalUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir portal"
                      className="shrink-0 p-2 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-500 dark:text-slate-400"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                {/* Tips */}
                <div className="rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 p-3 text-xs text-primary-700 dark:text-primary-400 space-y-1">
                  <p className="font-semibold">Consejos para compartir</p>
                  <ul className="list-disc list-inside space-y-0.5 text-primary-600 dark:text-primary-500">
                    <li>Añade el enlace en tu bio de Instagram o Facebook.</li>
                    <li>Inclúyelo en tu firma de email o en mensajes de WhatsApp.</li>
                    <li>Usa el widget embebible (abajo) para tu sitio web.</li>
                  </ul>
                </div>

                {/* Embed code */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Code className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      Widget para tu sitio web
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Pega este código en el HTML de tu sitio web. Aparecerá un botón flotante para agendar.
                  </p>
                  <div className="relative">
                    <pre className="rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 px-3 py-3 text-xs text-gray-700 dark:text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                      {embedCode}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(embedCode!, "embed")}
                      title="Copiar código"
                      className="absolute top-2 right-2 p-1.5 rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-500 dark:text-slate-400"
                    >
                      {copied === "embed" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={() => router.push("/dashboard/services")} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                    Gestionar servicios →
                  </button>
                  <button onClick={() => router.push("/dashboard/schedules")} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                    Gestionar horarios →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Change password */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Cambiar contraseña</h2>
          <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
            <Input label="Contraseña actual" type="password" required value={pwForm.current_password} onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })} />
            <Input label="Nueva contraseña" type="password" required minLength={8} value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} />
            <Input label="Confirmar nueva contraseña" type="password" required value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
            {pwError && <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">{pwError}</p>}
            {pwSuccess && <p className="rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2 text-sm text-green-600 dark:text-green-400">{pwSuccess}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={pwSaving}>{pwSaving ? "Guardando..." : "Actualizar contraseña"}</Button>
            </div>
          </form>
        </div>

        {/* Subscription */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Suscripción</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">Gestiona tu plan y suscripción desde esta sección.</p>
          <button
            onClick={() => router.push(isSuperAdmin() ? "/superadmin/plans" : "/dashboard/settings")}
            className="mt-4 rounded-lg border border-primary-600 dark:border-primary-500 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          >
            Ver Planes
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <span className="text-sm text-gray-500 dark:text-slate-400">{label}:</span>
      <span className={`ml-2 text-sm font-medium text-gray-900 dark:text-slate-100 ${className || ""}`}>{value}</span>
    </div>
  );
}
