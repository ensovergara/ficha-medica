"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Plan } from "@/types";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import Button from "@/components/ui/button";

interface Tenant { id: string; name: string; slug: string; }
interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  trial: "Prueba", active: "Activa", past_due: "Vencida", cancelled: "Cancelada",
};
const statusColors: Record<string, string> = {
  trial: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  past_due: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [editForm, setEditForm] = useState({ status: "", plan_id: "" });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      const [s, t, p] = await Promise.all([
        api.get("/subscriptions/"),
        api.get("/tenants/"),
        api.get("/subscriptions/plans/"),
      ]);
      setSubs(s.data);
      setTenants(t.data);
      setPlans(p.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const getTenantName = (id: string) => tenants.find((t) => t.id === id)?.name || id.substring(0, 8) + "...";
  const getPlanName = (id: string) => plans.find((p) => p.id === id)?.name || "-";

  const openEdit = (sub: Subscription) => {
    setEditing(sub);
    setEditForm({ status: sub.status, plan_id: sub.plan_id });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/subscriptions/${editing.id}`, {
        status: editForm.status,
        plan_id: editForm.plan_id,
      });
      setEditing(null);
      fetchAll();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Suscripciones</h1>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Tenant</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Inicio</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Vencimiento</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">Cargando...</td></tr>
            ) : subs.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">No hay suscripciones</td></tr>
            ) : (
              subs.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-100">{getTenantName(s.tenant_id)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">{getPlanName(s.plan_id)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[s.status] || "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300"}`}>
                      {statusLabels[s.status] || s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                    {s.current_period_start ? new Date(s.current_period_start).toLocaleDateString("es-CL") : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                    {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString("es-CL") : "-"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>Editar</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar Suscripción">
        {editing && (
          <form onSubmit={handleSave} className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-slate-400">Tenant: <span className="font-medium text-gray-900 dark:text-slate-100">{getTenantName(editing.tenant_id)}</span></p>
            <Select
              label="Plan"
              value={editForm.plan_id}
              onChange={(e) => setEditForm({ ...editForm, plan_id: e.target.value })}
              options={plans.map((p) => ({ value: p.id, label: `${p.name} ($${p.price_monthly}/mes)` }))}
            />
            <Select
              label="Estado"
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              options={Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l }))}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" type="button" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
