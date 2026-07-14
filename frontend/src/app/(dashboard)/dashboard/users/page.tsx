"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { User } from "@/types";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { toast } from "@/lib/toast";

const roleLabels: Record<string, string> = { admin: "Administrador", veterinario: "Veterinario", recepcionista: "Recepcionista", auxiliar: "Auxiliar", superadmin: "Super Admin" };
const roleOptions = [
  { value: "admin", label: "Administrador" },
  { value: "veterinario", label: "Veterinario" },
  { value: "recepcionista", label: "Recepcionista" },
  { value: "auxiliar", label: "Auxiliar" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [createForm, setCreateForm] = useState({ email: "", password: "", first_name: "", last_name: "", role: "veterinario" });
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", email: "", role: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    try { const { data } = await api.get("/users/"); setUsers(data); } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/users/", createForm);
      setShowCreateModal(false);
      setCreateForm({ email: "", password: "", first_name: "", last_name: "", role: "veterinario" });
      toast.success("Usuario creado exitosamente");
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al crear usuario");
    } finally { setSaving(false); }
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditForm({ first_name: u.first_name, last_name: u.last_name, email: u.email, role: u.role });
    setError("");
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setError("");
    setSaving(true);
    try {
      await api.patch(`/users/${editUser.id}`, editForm);
      setShowEditModal(false);
      toast.success("Usuario actualizado");
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al actualizar");
    } finally { setSaving(false); }
  };

  const toggleActive = async (u: User) => {
    try {
      await api.patch(`/users/${u.id}`, { is_active: !u.is_active });
      toast.success(u.is_active ? "Usuario desactivado" : "Usuario activado");
      fetchUsers();
    } catch {
      toast.error("Error al actualizar estado");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Usuarios</h1>
        <Button onClick={() => { setError(""); setShowCreateModal(true); }}>Nuevo Usuario</Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">Cargando...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">No hay usuarios</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-100">{u.first_name} {u.last_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{u.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{roleLabels[u.role] || u.role}</td>
                  <td className="px-6 py-4"><Badge variant={u.is_active ? "success" : "danger"}>{u.is_active ? "Activo" : "Inactivo"}</Badge></td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>Editar</Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(u)}>{u.is_active ? "Desactivar" : "Activar"}</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nuevo Usuario">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre" required value={createForm.first_name} onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })} />
            <Input label="Apellido" required value={createForm.last_name} onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })} />
          </div>
          <Input label="Email" type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
          <Input label="Contraseña" type="password" required minLength={8} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
          <Select label="Rol" required value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} options={roleOptions} />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creando..." : "Crear usuario"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Usuario">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre" required value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
            <Input label="Apellido" required value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
          </div>
          <Input label="Email" type="email" required value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          <Select label="Rol" required value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} options={roleOptions} />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
