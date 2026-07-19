"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "@/lib/toast";
import type { Client } from "@/types";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import Pagination from "@/components/ui/pagination";

const LIMIT = 20;

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", rut: "", phone: "", email: "", address: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [portalModal, setPortalModal] = useState(false);
  const [portalUrl, setPortalUrl] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchClients = async (s = skip) => {
    setLoading(true);
    try {
      const params: any = { skip: s, limit: LIMIT };
      if (search) params.search = search;
      const [list, count] = await Promise.all([
        api.get("/clients/", { params }),
        api.get("/clients/count", { params: search ? { search } : {} }),
      ]);
      setClients(list.data);
      setTotal(count.data.total);
    } catch {
      toast.error("Error al cargar clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setSkip(0); fetchClients(0); }, [search]);

  const handlePageChange = (newSkip: number) => {
    setSkip(newSkip);
    fetchClients(newSkip);
  };

  const resetForm = () => {
    setForm({ first_name: "", last_name: "", rut: "", phone: "", email: "", address: "" });
    setEditingId(null);
    setFormError("");
  };

  const openEdit = (c: Client) => {
    setForm({ first_name: c.first_name, last_name: c.last_name, rut: c.rut || "", phone: c.phone || "", email: c.email || "", address: c.address || "" });
    setEditingId(c.id);
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const payload = { ...form, rut: form.rut || null, phone: form.phone || null, email: form.email || null, address: form.address || null };
      if (editingId) {
        await api.patch(`/clients/${editingId}`, payload);
        toast.success("Cliente actualizado.");
      } else {
        await api.post("/clients/", payload);
        toast.success("Cliente creado.");
      }
      setShowModal(false);
      resetForm();
      fetchClients(0);
      setSkip(0);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Error al guardar.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este cliente?")) return;
    try {
      await api.delete(`/clients/${id}`);
      toast.success("Cliente eliminado.");
      fetchClients();
    } catch {
      toast.error("No se pudo eliminar el cliente.");
    }
  };

  const generatePortal = async (clientId: string) => {
    setPortalLoading(true);
    setPortalUrl("");
    setCopied(false);
    setPortalModal(true);
    try {
      const { data } = await api.post(`/portal/generate-access/${clientId}`);
      setPortalUrl(`${window.location.origin}/portal?code=${data.access_code}`);
    } catch {
      setPortalUrl("Error al generar el enlace.");
      toast.error("No se pudo generar el enlace del portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast.success("Enlace copiado al portapapeles.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-100">Clientes</h1>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>Nuevo Cliente</Button>
      </div>

      <div className="mt-6">
        <Input placeholder="Buscar por nombre o RUT..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full" />
      </div>

      <div className="mt-6">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Nombre</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">RUT</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Teléfono</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Email</th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={5} className="px-4 lg:px-6 py-4 text-center text-sm text-gray-500 dark:text-slate-400">Cargando...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={5} className="px-4 lg:px-6 py-4 text-center text-sm text-gray-500 dark:text-slate-400">No hay clientes</td></tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 lg:px-6 py-4 text-xs md:text-sm font-medium text-gray-900 dark:text-slate-100">{c.first_name} {c.last_name}</td>
                    <td className="px-4 lg:px-6 py-4 text-xs md:text-sm text-gray-500 dark:text-slate-400">{c.rut || "-"}</td>
                    <td className="px-4 lg:px-6 py-4 text-xs md:text-sm text-gray-500 dark:text-slate-400">{c.phone || "-"}</td>
                    <td className="px-4 lg:px-6 py-4 text-xs md:text-sm text-gray-500 dark:text-slate-400">{c.email || "-"}</td>
                    <td className="px-4 lg:px-6 py-4 text-right space-x-1 md:space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => generatePortal(c.id)} title="Generar enlace portal">🔗</Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Editar</Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(c.id)}>Eliminar</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-slate-400">Cargando...</div>
          ) : clients.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-slate-400">No hay clientes</div>
          ) : (
            clients.map((c) => (
              <div key={c.id} className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{c.first_name} {c.last_name}</p>
                    {c.email && <p className="text-xs text-gray-500 dark:text-slate-400">{c.email}</p>}
                  </div>
                </div>
                <div className="space-y-1 text-xs text-gray-600 dark:text-slate-400 mb-3">
                  {c.rut && <div><span className="font-medium">RUT:</span> {c.rut}</div>}
                  {c.phone && <div><span className="font-medium">Tel:</span> {c.phone}</div>}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => generatePortal(c.id)} title="Generar enlace portal">🔗 Portal</Button>
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => openEdit(c)}>Editar</Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(c.id)}>Eliminar</Button>
                </div>
              </div>
            ))
          )}
        </div>

        <Pagination skip={skip} limit={LIMIT} total={total} onPageChange={handlePageChange} />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? "Editar Cliente" : "Nuevo Cliente"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <Input label="Apellido" required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <Input label="RUT / DNI" value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <Input label="Dirección" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          {formError && <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">{formError}</p>}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear cliente"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={portalModal} onClose={() => setPortalModal(false)} title="Portal para dueño de mascota">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">Comparte este enlace con el cliente para que vea las fichas de sus mascotas sin necesidad de cuenta.</p>
          {portalLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
            </div>
          ) : (
            <div className="flex gap-2">
              <input readOnly value={portalUrl} className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-2 text-sm text-gray-700 dark:text-slate-200 font-mono" />
              <Button onClick={copyUrl} disabled={!portalUrl || portalUrl.startsWith("Error")}>
                {copied ? "✓ Copiado" : "Copiar"}
              </Button>
            </div>
          )}
          <p className="text-xs text-gray-400 dark:text-slate-500">Válido por 1 año. Generar uno nuevo revoca el anterior.</p>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setPortalModal(false)}>Cerrar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
