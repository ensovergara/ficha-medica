"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";

const STEPS = ["Bienvenida", "Tu clínica", "Primer usuario", "Listo"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [clinicForm, setClinicForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [userForm, setUserForm] = useState({ first_name: "", last_name: "", email: "", password: "", role: "veterinario" });
  const [loading, setLoading] = useState(false);

  const handleClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: me } = await api.get("/auth/me");
      await api.patch(`/tenants/${me.tenant_id}`, {
        phone: clinicForm.phone || null,
        email: clinicForm.email || null,
        address: clinicForm.address || null,
      });
      setStep(2);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/users/", userForm);
      setStep(3);
    } catch {
      setStep(3); // skip if user creation fails
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i <= step ? "bg-primary-600 text-white" : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400"}`}>
                {i < step ? "✓" : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`h-0.5 w-8 ${i < step ? "bg-primary-600" : "bg-gray-200 dark:bg-slate-700"}`} />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-transparent dark:border-slate-700 p-8 shadow-xl dark:shadow-slate-900/50">
          {step === 0 && (
            <div className="text-center space-y-6">
              <div className="text-6xl">🐾</div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">¡Bienvenido a FichaMédica!</h1>
              <p className="text-gray-500 dark:text-slate-400">Configura tu clínica en 2 minutos y comienza a gestionar tus pacientes.</p>
              <Button className="w-full" onClick={() => setStep(1)}>Comenzar configuración</Button>
              <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
                Saltar por ahora
              </button>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleClinic} className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Tu clínica</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Esta información aparecerá en tus documentos y facturas.</p>
              <Input label="Teléfono" value={clinicForm.phone} onChange={(e) => setClinicForm({ ...clinicForm, phone: e.target.value })} />
              <Input label="Email de contacto" type="email" value={clinicForm.email} onChange={(e) => setClinicForm({ ...clinicForm, email: e.target.value })} />
              <Input label="Dirección" value={clinicForm.address} onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })} />
              <div className="flex gap-3">
                <Button variant="secondary" type="button" onClick={() => setStep(0)}>Atrás</Button>
                <Button className="flex-1" type="submit" disabled={loading}>{loading ? "Guardando..." : "Continuar"}</Button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleUser} className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Agrega tu primer veterinario</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Puedes agregar más usuarios después desde Configuración.</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nombre" required value={userForm.first_name} onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })} />
                <Input label="Apellido" required value={userForm.last_name} onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })} />
              </div>
              <Input label="Email" type="email" required value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
              <Input label="Contraseña temporal" type="password" required minLength={8} value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
              <Select label="Rol" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} options={[{ value: "veterinario", label: "Veterinario" }, { value: "recepcionista", label: "Recepcionista" }, { value: "auxiliar", label: "Auxiliar" }]} />
              <div className="flex gap-3">
                <Button variant="secondary" type="button" onClick={() => setStep(3)}>Saltar</Button>
                <Button className="flex-1" type="submit" disabled={loading}>{loading ? "Creando..." : "Crear usuario"}</Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="text-center space-y-6">
              <div className="text-6xl">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">¡Todo listo!</h2>
              <p className="text-gray-500 dark:text-slate-400">Tu clínica está configurada. Ya puedes empezar a registrar pacientes y consultas.</p>
              <Button className="w-full" onClick={() => router.push("/dashboard")}>Ir al dashboard</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
