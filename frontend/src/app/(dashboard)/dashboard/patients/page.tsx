"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { toast } from "@/lib/toast";
import type { Patient, Client } from "@/types";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Button from "@/components/ui/button";
import Pagination from "@/components/ui/pagination";

const LIMIT = 20;

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_id: "", name: "", species: "", breed: "", birth_date: "", sex: "", weight: "", microchip: "",
  });

  const fetchPatients = async (s = skip) => {
    setLoading(true);
    try {
      const params: any = { skip: s, limit: LIMIT };
      if (search) params.search = search;
      if (speciesFilter) params.species = speciesFilter;
      const countParams: any = {};
      if (search) countParams.search = search;
      if (speciesFilter) countParams.species = speciesFilter;
      const [list, count] = await Promise.all([
        api.get("/patients/", { params }),
        api.get("/patients/count", { params: countParams }),
      ]);
      setPatients(list.data);
      setTotal(count.data.total);
    } catch {
      toast.error("Error al cargar pacientes.");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data } = await api.get("/clients/", { params: { limit: 200 } });
      setClients(data);
    } catch {}
  };

  useEffect(() => { setSkip(0); fetchPatients(0); }, [search, speciesFilter]);
  useEffect(() => { fetchClients(); }, []);

  const handlePageChange = (newSkip: number) => {
    setSkip(newSkip);
    fetchPatients(newSkip);
  };

  const resetForm = () => {
    setForm({ client_id: "", name: "", species: "", breed: "", birth_date: "", sex: "", weight: "", microchip: "" });
    setEditingId(null);
    setFormError("");
  };

  const openEdit = (p: Patient) => {
    setForm({
      client_id: p.client_id, name: p.name, species: p.species, breed: p.breed || "",
      birth_date: p.birth_date || "", sex: p.sex || "", weight: p.weight?.toString() || "", microchip: p.microchip || "",
    });
    setEditingId(p.id);
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        weight: form.weight ? parseFloat(form.weight) : null,
        birth_date: form.birth_date || null,
        breed: form.breed || null,
        sex: form.sex || null,
        microchip: form.microchip || null,
      };
      if (editingId) {
        await api.patch(`/patients/${editingId}`, payload);
        toast.success("Paciente actualizado.");
      } else {
        await api.post("/patients/", payload);
        toast.success("Paciente creado.");
      }
      setShowModal(false);
      resetForm();
      fetchPatients();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Error al guardar.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (p: Patient) => {
    if (!confirm(`¿${p.is_active ? "Desactivar" : "Activar"} al paciente "${p.name}"?`)) return;
    try {
      await api.patch(`/patients/${p.id}`, { is_active: !p.is_active });
      toast.success(`Paciente ${p.is_active ? "desactivado" : "activado"}.`);
      fetchPatients();
    } catch {
      toast.error("Error al cambiar estado del paciente.");
    }
  };

  const speciesIcon = (s: string) => {
    const l = s.toLowerCase();
    if (l.includes("perro")) return "🐕";
    if (l.includes("gato")) return "🐈";
    if (l.includes("ave")) return "🐦";
    if (l.includes("conejo")) return "🐇";
    return "🐾";
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-100">Pacientes</h1>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>Nuevo Paciente</Button>
      </div>

      <div className="mt-6 flex flex-col md:flex-row gap-2 md:gap-3">
        <Input placeholder="Buscar por nombre o microchip..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <select
          value={speciesFilter}
          onChange={(e) => setSpeciesFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs md:text-sm text-gray-700 dark:text-slate-200 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 md:min-w-48"
        >
          <option value="">Todas las especies</option>
          <option value="Perro">Perro</option>
          <option value="Gato">Gato</option>
          <option value="Ave">Ave</option>
          <option value="Conejo">Conejo</option>
          <option value="Reptil">Reptil</option>
          <option value="Otro">Otro</option>
        </select>
      </div>

      <div className="mt-6">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Paciente</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Especie / Raza</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Nacimiento</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Peso</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Estado</th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={6} className="px-4 lg:px-6 py-4 text-center text-sm text-gray-500 dark:text-slate-400">Cargando...</td></tr>
              ) : patients.length === 0 ? (
                <tr><td colSpan={6} className="px-4 lg:px-6 py-4 text-center text-sm text-gray-500 dark:text-slate-400">No hay pacientes</td></tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/30 ${!p.is_active ? "opacity-50" : ""}`}>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-2 md:gap-3">
                        <span className="text-lg md:text-xl">{speciesIcon(p.species)}</span>
                        <Link href={`/dashboard/patients/${p.id}`} className="text-xs md:text-sm font-medium text-gray-900 dark:text-slate-100 hover:text-primary-600 dark:hover:text-primary-400">
                          {p.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-xs md:text-sm text-gray-500 dark:text-slate-400">{p.species}{p.breed ? ` — ${p.breed}` : ""}</td>
                    <td className="px-4 lg:px-6 py-4 text-xs md:text-sm text-gray-500 dark:text-slate-400">{p.birth_date || "-"}</td>
                    <td className="px-4 lg:px-6 py-4 text-xs md:text-sm text-gray-500 dark:text-slate-400">{p.weight ? `${p.weight} kg` : "-"}</td>
                    <td className="px-4 lg:px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${p.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                        {p.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-right space-x-1 md:space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>Editar</Button>
                      <Button variant="ghost" size="sm" className={p.is_active ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"} onClick={() => handleDeactivate(p)}>
                        {p.is_active ? "Desactivar" : "Activar"}
                      </Button>
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
          ) : patients.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-slate-400">No hay pacientes</div>
          ) : (
            patients.map((p) => (
              <div key={p.id} className={`rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 ${!p.is_active ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <Link href={`/dashboard/patients/${p.id}`} className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0">{speciesIcon(p.species)}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{p.species}{p.breed ? ` — ${p.breed}` : ""}</p>
                    </div>
                  </Link>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${p.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                    {p.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-gray-600 dark:text-slate-400">
                  {p.birth_date && <div><span className="font-medium">Nacimiento:</span> {p.birth_date}</div>}
                  {p.weight && <div><span className="font-medium">Peso:</span> {p.weight} kg</div>}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => openEdit(p)}>Editar</Button>
                  <Button variant="ghost" size="sm" className={p.is_active ? "flex-1 text-red-600 hover:text-red-700" : "flex-1 text-green-600 hover:text-green-700"} onClick={() => handleDeactivate(p)}>
                    {p.is_active ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <Pagination skip={skip} limit={LIMIT} total={total} onPageChange={handlePageChange} />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? "Editar Paciente" : "Nuevo Paciente"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Dueño" required value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} placeholder="Seleccionar cliente" options={clients.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select label="Especie" required value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} placeholder="Seleccionar" options={[{ value: "Perro", label: "Perro" }, { value: "Gato", label: "Gato" }, { value: "Ave", label: "Ave" }, { value: "Conejo", label: "Conejo" }, { value: "Reptil", label: "Reptil" }, { value: "Otro", label: "Otro" }]} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Raza" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
            <Input label="Fecha de nacimiento" type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select label="Sexo" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })} placeholder="Seleccionar" options={[{ value: "Macho", label: "Macho" }, { value: "Hembra", label: "Hembra" }]} />
            <Input label="Peso (kg)" type="number" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
            <Input label="Microchip" value={form.microchip} onChange={(e) => setForm({ ...form, microchip: e.target.value })} />
          </div>
          {formError && <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">{formError}</p>}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear paciente"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
