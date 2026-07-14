"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Service, User } from "@/types";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { Plus, Clock, DollarSign, Users, Trash2, Pencil } from "lucide-react";

interface ServiceForm {
  name: string;
  description: string;
  duration_minutes: string;
  price: string;
  is_active: boolean;
}

const emptyForm = (): ServiceForm => ({
  name: "",
  description: "",
  duration_minutes: "30",
  price: "",
  is_active: true,
});

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [vets, setVets] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showVetsModal, setShowVetsModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [assignedVetIds, setAssignedVetIds] = useState<string[]>([]);
  const [assigningVet, setAssigningVet] = useState(false);

  const fetchServices = async () => {
    try {
      const { data } = await api.get("/services/");
      setServices(data);
    } catch {}
    finally { setLoading(false); }
  };

  const fetchVets = async () => {
    try {
      const { data } = await api.get("/users/");
      setVets(data.filter((u: User) => u.role === "veterinario" && u.is_active));
    } catch {}
  };

  useEffect(() => { fetchServices(); fetchVets(); }, []);

  function openCreate() {
    setEditService(null);
    setForm(emptyForm());
    setError("");
    setShowModal(true);
  }

  function openEdit(svc: Service) {
    setEditService(svc);
    setForm({
      name: svc.name,
      description: svc.description || "",
      duration_minutes: String(svc.duration_minutes),
      price: svc.price != null ? String(svc.price) : "",
      is_active: svc.is_active,
    });
    setError("");
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      duration_minutes: Number(form.duration_minutes),
      price: form.price ? Number(form.price) : null,
      is_active: form.is_active,
    };
    try {
      if (editService) {
        await api.patch(`/services/${editService.id}`, payload);
        toast.success("Servicio actualizado");
      } else {
        await api.post("/services/", payload);
        toast.success("Servicio creado");
      }
      setShowModal(false);
      fetchServices();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Error al guardar");
    } finally { setSaving(false); }
  }

  async function handleDelete(svc: Service) {
    if (!confirm(`¿Eliminar el servicio "${svc.name}"?`)) return;
    try {
      await api.delete(`/services/${svc.id}`);
      toast.success("Servicio eliminado");
      fetchServices();
    } catch {
      toast.error("No se pudo eliminar el servicio");
    }
  }

  async function openVetsModal(svc: Service) {
    setSelectedService(svc);
    try {
      const { data } = await api.get(`/services/${svc.id}/vets`);
      setAssignedVetIds(data.map((v: { veterinarian_id: string }) => v.veterinarian_id));
    } catch { setAssignedVetIds([]); }
    setShowVetsModal(true);
  }

  async function toggleVet(vetId: string) {
    if (!selectedService) return;
    setAssigningVet(true);
    try {
      if (assignedVetIds.includes(vetId)) {
        await api.delete(`/services/${selectedService.id}/vets/${vetId}`);
        setAssignedVetIds((prev) => prev.filter((id) => id !== vetId));
        toast.success("Veterinario removido del servicio");
      } else {
        await api.post(`/services/${selectedService.id}/vets`, { veterinarian_id: vetId });
        setAssignedVetIds((prev) => [...prev, vetId]);
        toast.success("Veterinario asignado al servicio");
      }
    } catch {
      toast.error("Error al actualizar asignación");
    } finally { setAssigningVet(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Servicios</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Define los servicios que ofrece tu clínica y asígnalos a veterinarios.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> Nuevo servicio
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-600">
          <Clock className="h-10 w-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-slate-400 font-medium">No hay servicios creados</p>
          <p className="text-sm text-gray-400 dark:text-slate-500 mb-4">Crea el primer servicio para comenzar a agendar citas.</p>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Crear servicio
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((svc) => (
            <div key={svc.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-slate-100 truncate">{svc.name}</p>
                  {svc.description && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">{svc.description}</p>
                  )}
                </div>
                <Badge variant={svc.is_active ? "success" : "default"}>
                  {svc.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
                  {svc.duration_minutes} min
                </span>
                {svc.price != null && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />
                    {Number(svc.price).toLocaleString("es-CL")}
                  </span>
                )}
              </div>

              <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-slate-700">
                <button
                  onClick={() => openVetsModal(svc)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 py-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                >
                  <Users className="h-3.5 w-3.5" /> Veterinarios
                </button>
                <button
                  onClick={() => openEdit(svc)}
                  className="flex items-center justify-center gap-1.5 text-xs text-gray-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 py-1.5 px-3 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(svc)}
                  className="flex items-center justify-center gap-1.5 text-xs text-gray-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 py-1.5 px-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editService ? "Editar servicio" : "Nuevo servicio"}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nombre *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Consulta general" />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-slate-500"
              placeholder="Descripción del servicio..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Duración (minutos) *" type="number" min={5} max={480} value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))} required />
            <Input label="Precio (CLP)" type="number" min={0} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="Opcional" />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="rounded border-gray-300 dark:border-slate-600"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-slate-300">
              Disponible para reservas
            </label>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : editService ? "Guardar cambios" : "Crear servicio"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showVetsModal} onClose={() => setShowVetsModal(false)} title={`Veterinarios — ${selectedService?.name}`}>
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Selecciona los veterinarios que ofrecen este servicio. Solo ellos aparecerán en el portal público.
          </p>
          {vets.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
              No hay veterinarios activos. Crea usuarios con rol Veterinario primero.
            </p>
          ) : (
            vets.map((vet) => {
              const assigned = assignedVetIds.includes(vet.id);
              return (
                <button
                  key={vet.id}
                  onClick={() => toggleVet(vet.id)}
                  disabled={assigningVet}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left disabled:opacity-60 ${
                    assigned
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-600"
                      : "border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500"
                  }`}
                >
                  <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold text-sm shrink-0">
                    {vet.first_name[0]}{vet.last_name[0]}
                  </div>
                  <span className="font-medium text-gray-900 dark:text-slate-100 text-sm">
                    {vet.first_name} {vet.last_name}
                  </span>
                  {assigned && (
                    <span className="ml-auto text-xs text-primary-600 dark:text-primary-400 font-medium">Asignado ✓</span>
                  )}
                </button>
              );
            })
          )}
          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowVetsModal(false)}>Cerrar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
