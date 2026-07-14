"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Plan } from "@/types";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";

const emptyForm = { name: "", max_users: "1", max_patients: "", price_monthly: "0", price_yearly: "0" };

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    try {
      const { data } = await api.get("/subscriptions/plans/");
      setPlans(data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchPlans(); }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/subscriptions/plans/", {
        name: form.name,
        max_users: parseInt(form.max_users),
        max_patients: form.max_patients ? parseInt(form.max_patients) : null,
        price_monthly: parseFloat(form.price_monthly),
        price_yearly: parseFloat(form.price_yearly),
      });
      setShowModal(false);
      fetchPlans();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Error al crear plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Planes</h1>
        <Button onClick={openCreate}>Nuevo Plan</Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-48 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 animate-pulse" />)
        ) : plans.length === 0 ? (
          <p className="text-gray-500 dark:text-slate-400">No hay planes creados.</p>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 flex flex-col">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">{plan.name}</h3>
              <p className="mt-2 text-3xl font-bold text-primary-600 dark:text-primary-400">
                ${plan.price_monthly.toLocaleString()}
                <span className="text-sm font-normal text-gray-500 dark:text-slate-400">/mes</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-slate-400 flex-1">
                <li>Max usuarios: <span className="font-medium text-gray-900 dark:text-slate-100">{plan.max_users || "Ilimitado"}</span></li>
                <li>Max pacientes: <span className="font-medium text-gray-900 dark:text-slate-100">{plan.max_patients || "Ilimitado"}</span></li>
                {plan.features && Object.entries(plan.features).map(([key, val]) => (
                  <li key={key} className="flex items-center gap-2">
                    <span className={val ? "text-green-500 dark:text-green-400" : "text-gray-300 dark:text-slate-600"}>{val ? "✓" : "✗"}</span>
                    {key.replace(/_/g, " ")}
                  </li>
                ))}
              </ul>
              {plan.price_yearly > 0 && (
                <p className="mt-3 text-xs text-gray-400 dark:text-slate-500">${plan.price_yearly.toLocaleString()}/año</p>
              )}
            </div>
          ))
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nuevo Plan">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre del plan" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Profesional" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Máx. usuarios" type="number" min="1" required value={form.max_users} onChange={(e) => setForm({ ...form, max_users: e.target.value })} />
            <Input label="Máx. pacientes (vacío = ilimitado)" type="number" min="1" value={form.max_patients} onChange={(e) => setForm({ ...form, max_patients: e.target.value })} placeholder="Ilimitado" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Precio mensual ($)" type="number" min="0" step="0.01" required value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: e.target.value })} />
            <Input label="Precio anual ($)" type="number" min="0" step="0.01" value={form.price_yearly} onChange={(e) => setForm({ ...form, price_yearly: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creando..." : "Crear plan"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
