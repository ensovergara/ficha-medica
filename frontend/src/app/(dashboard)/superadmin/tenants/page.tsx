"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Tenant } from "@/types";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";

const emptyForm = { name: "", slug: "", email: "", phone: "", address: "" };

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTenants = async () => {
    try {
      const { data } = await api.get("/tenants/");
      setTenants(data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchTenants(); }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setShowModal(true);
  };

  const openEdit = (t: Tenant) => {
    setForm({ name: t.name, slug: t.slug, email: t.email || "", phone: t.phone || "", address: t.address || "" });
    setEditingId(t.id);
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = { ...form, email: form.email || null, phone: form.phone || null, address: form.address || null };
      if (editingId) {
        const { slug, ...updatePayload } = payload;
        await api.patch(`/tenants/${editingId}`, updatePayload);
      } else {
        await api.post("/tenants/", payload);
      }
      setShowModal(false);
      fetchTenants();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: Tenant) => {
    if (!confirm(`¿${t.is_active ? "Desactivar" : "Activar"} el tenant "${t.name}"?`)) return;
    await api.patch(`/tenants/${t.id}`, { is_active: !t.is_active });
    fetchTenants();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Tenants (Clínicas)</h1>
        <Button onClick={openCreate}>Nuevo Tenant</Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Slug</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Creado</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">Cargando...</td></tr>
            ) : tenants.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">No hay tenants</td></tr>
            ) : (
              tenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-100">{t.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 font-mono">{t.slug}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{t.email || "-"}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${t.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                      {t.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{new Date(t.created_at).toLocaleDateString("es-CL")}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>Editar</Button>
                    <Button variant="ghost" size="sm" className={t.is_active ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"} onClick={() => toggleActive(t)}>
                      {t.is_active ? "Desactivar" : "Activar"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? "Editar Tenant" : "Nuevo Tenant"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre de la clínica" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {!editingId && (
            <Input label="Slug (identificador único)" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} placeholder="mi-clinica" />
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Input label="Dirección" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear tenant"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
