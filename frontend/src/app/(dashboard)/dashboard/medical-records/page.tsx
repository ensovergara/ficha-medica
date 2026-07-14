"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import type { MedicalRecord, Patient } from "@/types";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Button from "@/components/ui/button";
import Textarea from "@/components/ui/textarea";

export default function MedicalRecordsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ patient_id: "", record_number: "", notes: "" });

  const fetch = async () => {
    try {
      const [r, p] = await Promise.all([api.get("/medical-records/"), api.get("/patients/")]);
      setRecords(r.data);
      setPatients(p.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/medical-records/", { ...form, record_number: form.record_number || null, notes: form.notes || null });
    setShowModal(false);
    setForm({ patient_id: "", record_number: "", notes: "" });
    fetch();
  };

  const getPatientName = (id: string) => patients.find((p) => p.id === id)?.name || "-";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Fichas Médicas</h1>
        <Button onClick={() => setShowModal(true)}>Nueva Ficha</Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">N° Ficha</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Paciente</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Notas</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">Cargando...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">No hay fichas médicas</td></tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                  <td className="px-6 py-4 text-sm font-medium text-primary-600 dark:text-primary-400">{r.record_number || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-slate-100">
                    <Link href={`/dashboard/patients/${r.patient_id}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                      {getPatientName(r.patient_id)}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{r.notes?.substring(0, 80) || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{new Date(r.created_at).toLocaleDateString("es-CL")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nueva Ficha Médica">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Paciente" required value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} placeholder="Seleccionar" options={patients.map((p) => ({ value: p.id, label: p.name }))} />
          <Input label="N° de Ficha" value={form.record_number} onChange={(e) => setForm({ ...form, record_number: e.target.value })} />
          <Textarea label="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit">Crear ficha</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
