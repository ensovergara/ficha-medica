"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import type { Patient, Consultation, MedicalRecord } from "@/types";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";

interface Vaccination { id: string; vaccine_name: string; batch_number: string | null; next_dose_date: string | null; created_at: string; }
interface Prescription { id: string; medication: string; dosage: string | null; frequency: string | null; duration: string | null; notes: string | null; consultation_id: string; }
interface LabResult { id: string; test_type: string; results: any; file_url: string | null; created_at: string; }

export default function PatientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("consultations");

  const [showVacModal, setShowVacModal] = useState(false);
  const [vacForm, setVacForm] = useState({ vaccine_name: "", batch_number: "", next_dose_date: "" });
  const [vacError, setVacError] = useState("");
  const [vacSaving, setVacSaving] = useState(false);

  const [showConsModal, setShowConsModal] = useState(false);
  const [consForm, setConsForm] = useState({ medical_record_id: "", reason: "", diagnosis: "", treatment: "", notes: "", weight_at_visit: "", temperature: "" });
  const [consError, setConsError] = useState("");
  const [consSaving, setConsSaving] = useState(false);

  const [showPrescModal, setShowPrescModal] = useState(false);
  const [prescForm, setPrescForm] = useState({ consultation_id: "", medication: "", dosage: "", frequency: "", duration: "", notes: "" });
  const [prescError, setPrescError] = useState("");
  const [prescSaving, setPrescSaving] = useState(false);

  const [showLabModal, setShowLabModal] = useState(false);
  const [labForm, setLabForm] = useState({ test_type: "", results_text: "" });
  const [labError, setLabError] = useState("");
  const [labSaving, setLabSaving] = useState(false);

  const loadAll = async () => {
    try {
      const [p, mr, c, v, pr, lr] = await Promise.all([
        api.get(`/patients/${id}`),
        api.get("/medical-records/", { params: { patient_id: id } }),
        api.get("/consultations/"),
        api.get("/vaccinations/", { params: { patient_id: id } }),
        api.get("/prescriptions/"),
        api.get("/lab-results/", { params: { patient_id: id } }),
      ].map(p => p.catch(() => ({ data: [] }))));
      setPatient(p.data);
      setRecords(Array.isArray(mr.data) ? mr.data : []);
      setConsultations(Array.isArray(c.data) ? c.data : []);
      setVaccinations(Array.isArray(v.data) ? v.data : []);
      setPrescriptions(Array.isArray(pr.data) ? pr.data : []);
      setLabResults(Array.isArray(lr.data) ? lr.data : []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, [id]);

  const recordIds = new Set(records.map((r) => r.id));
  const patientConsultations = consultations.filter((c) => recordIds.has(c.medical_record_id));
  const consultationIds = new Set(patientConsultations.map((c) => c.id));
  const patientPrescriptions = prescriptions.filter((p) => consultationIds.has(p.consultation_id));

  const handleVaccination = async (e: React.FormEvent) => {
    e.preventDefault();
    setVacError("");
    setVacSaving(true);
    try {
      await api.post("/vaccinations/", {
        patient_id: id,
        vaccine_name: vacForm.vaccine_name,
        batch_number: vacForm.batch_number || null,
        next_dose_date: vacForm.next_dose_date || null,
      });
      setShowVacModal(false);
      setVacForm({ vaccine_name: "", batch_number: "", next_dose_date: "" });
      const { data } = await api.get("/vaccinations/", { params: { patient_id: id } });
      setVaccinations(data);
    } catch (err: any) {
      setVacError(err?.response?.data?.detail || "Error al registrar vacuna.");
    } finally {
      setVacSaving(false);
    }
  };

  const handleConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    setConsError("");
    setConsSaving(true);
    try {
      let recordId = consForm.medical_record_id;
      if (!recordId && records.length > 0) recordId = records[0].id;
      if (!recordId) {
        const { data: newRecord } = await api.post("/medical-records/", { patient_id: id });
        recordId = newRecord.id;
        setRecords([newRecord, ...records]);
      }
      await api.post("/consultations/", {
        medical_record_id: recordId,
        reason: consForm.reason || null,
        diagnosis: consForm.diagnosis || null,
        treatment: consForm.treatment || null,
        notes: consForm.notes || null,
        weight_at_visit: consForm.weight_at_visit ? parseFloat(consForm.weight_at_visit) : null,
        temperature: consForm.temperature ? parseFloat(consForm.temperature) : null,
      });
      setShowConsModal(false);
      setConsForm({ medical_record_id: "", reason: "", diagnosis: "", treatment: "", notes: "", weight_at_visit: "", temperature: "" });
      const { data } = await api.get("/consultations/");
      setConsultations(data);
    } catch (err: any) {
      setConsError(err?.response?.data?.detail || "Error al registrar consulta.");
    } finally {
      setConsSaving(false);
    }
  };

  const handlePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrescError("");
    if (!prescForm.consultation_id) {
      setPrescError("Debes seleccionar una consulta.");
      return;
    }
    setPrescSaving(true);
    try {
      await api.post("/prescriptions/", {
        consultation_id: prescForm.consultation_id,
        medication: prescForm.medication,
        dosage: prescForm.dosage || null,
        frequency: prescForm.frequency || null,
        duration: prescForm.duration || null,
        notes: prescForm.notes || null,
      });
      setShowPrescModal(false);
      setPrescForm({ consultation_id: "", medication: "", dosage: "", frequency: "", duration: "", notes: "" });
      const { data } = await api.get("/prescriptions/");
      setPrescriptions(data);
    } catch (err: any) {
      setPrescError(err?.response?.data?.detail || "Error al registrar receta.");
    } finally {
      setPrescSaving(false);
    }
  };

  const handleLabResult = async (e: React.FormEvent) => {
    e.preventDefault();
    setLabError("");
    setLabSaving(true);
    try {
      let parsedResults: Record<string, any> | null = null;
      if (labForm.results_text.trim()) {
        try {
          parsedResults = JSON.parse(labForm.results_text);
        } catch {
          parsedResults = { descripcion: labForm.results_text };
        }
      }
      await api.post("/lab-results/", {
        patient_id: id,
        test_type: labForm.test_type,
        results: parsedResults,
      });
      setShowLabModal(false);
      setLabForm({ test_type: "", results_text: "" });
      const { data } = await api.get("/lab-results/", { params: { patient_id: id } });
      setLabResults(data);
    } catch (err: any) {
      setLabError(err?.response?.data?.detail || "Error al registrar resultado.");
    } finally {
      setLabSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" /></div>;
  if (!patient) return <p className="text-gray-500 dark:text-slate-400">Paciente no encontrado</p>;

  const tabs = [
    { key: "consultations", label: "Consultas", count: patientConsultations.length },
    { key: "vaccinations", label: "Vacunas", count: vaccinations.length },
    { key: "prescriptions", label: "Recetas", count: patientPrescriptions.length },
    { key: "lab_results", label: "Laboratorio", count: labResults.length },
  ];

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">&larr; Volver</Button>

      {/* Patient header */}
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20 text-4xl">
            {patient.species?.toLowerCase().includes("perro") ? "🐕" : patient.species?.toLowerCase().includes("gato") ? "🐈" : "🐾"}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{patient.name}</h1>
            <p className="text-gray-500 dark:text-slate-400">{patient.species}{patient.breed ? ` - ${patient.breed}` : ""}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-slate-400">
              {patient.birth_date && <span>Nacimiento: {patient.birth_date}</span>}
              {patient.sex && <span>Sexo: {patient.sex}</span>}
              {patient.weight && <span>Peso: {patient.weight} kg</span>}
              {patient.microchip && <span>Microchip: {patient.microchip}</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button onClick={() => { setConsError(""); setShowConsModal(true); }}>Nueva Consulta</Button>
            <Button variant="secondary" onClick={() => { setVacError(""); setShowVacModal(true); }}>Vacuna</Button>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL}/pdf/patient/${id}/medical-record`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
            >
              📄 PDF
            </a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex border-b border-gray-200 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? "border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400" : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"}`}
          >
            {tab.label} <span className="ml-1 rounded-full bg-gray-100 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 text-xs">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === "consultations" && (
          <div className="space-y-4">
            {patientConsultations.length === 0 ? <p className="text-gray-500 dark:text-slate-400">Sin consultas registradas</p> : patientConsultations.map((c) => (
              <div key={c.id} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    {c.reason && <p><span className="text-sm font-medium text-gray-700 dark:text-slate-300">Motivo:</span> <span className="text-sm text-gray-600 dark:text-slate-400">{c.reason}</span></p>}
                    {c.diagnosis && <p><span className="text-sm font-medium text-gray-700 dark:text-slate-300">Diagnóstico:</span> <span className="text-sm text-gray-600 dark:text-slate-400">{c.diagnosis}</span></p>}
                    {c.treatment && <p><span className="text-sm font-medium text-gray-700 dark:text-slate-300">Tratamiento:</span> <span className="text-sm text-gray-600 dark:text-slate-400">{c.treatment}</span></p>}
                    {c.notes && <p><span className="text-sm font-medium text-gray-700 dark:text-slate-300">Notas:</span> <span className="text-sm text-gray-600 dark:text-slate-400">{c.notes}</span></p>}
                  </div>
                  <div className="text-right text-sm text-gray-500 dark:text-slate-400">
                    <p>{new Date(c.created_at).toLocaleDateString("es-CL")}</p>
                    {c.weight_at_visit && <p>{c.weight_at_visit} kg</p>}
                    {c.temperature && <p>{c.temperature}°C</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "vaccinations" && (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Vacuna</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Lote</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Próxima dosis</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {vaccinations.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">Sin vacunas</td></tr>
                ) : vaccinations.map((v) => (
                  <tr key={v.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-100">{v.vaccine_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{v.batch_number || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{v.next_dose_date || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{new Date(v.created_at).toLocaleDateString("es-CL")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "prescriptions" && (
          <div>
            <div className="mb-4 flex justify-end">
              <Button onClick={() => { setPrescError(""); setPrescForm({ consultation_id: patientConsultations[0]?.id || "", medication: "", dosage: "", frequency: "", duration: "", notes: "" }); setShowPrescModal(true); }} disabled={patientConsultations.length === 0} title={patientConsultations.length === 0 ? "Crea una consulta primero" : ""}>
                Nueva Receta
              </Button>
            </div>
            {patientConsultations.length === 0 && (
              <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">Registra una consulta primero para poder agregar recetas.</p>
            )}
            <div className="space-y-3">
              {patientPrescriptions.length === 0 ? <p className="text-gray-500 dark:text-slate-400">Sin recetas</p> : patientPrescriptions.map((p) => (
                <div key={p.id} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <p className="font-medium text-gray-900 dark:text-slate-100">{p.medication}</p>
                  <div className="mt-1 flex gap-4 text-sm text-gray-500 dark:text-slate-400">
                    {p.dosage && <span>Dosis: {p.dosage}</span>}
                    {p.frequency && <span>Frecuencia: {p.frequency}</span>}
                    {p.duration && <span>Duración: {p.duration}</span>}
                  </div>
                  {p.notes && <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{p.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "lab_results" && (
          <div>
            <div className="mb-4 flex justify-end">
              <Button onClick={() => { setLabError(""); setLabForm({ test_type: "", results_text: "" }); setShowLabModal(true); }}>
                Agregar Resultado
              </Button>
            </div>
            <div className="space-y-3">
              {labResults.length === 0 ? <p className="text-gray-500 dark:text-slate-400">Sin resultados de laboratorio</p> : labResults.map((lr) => (
                <div key={lr.id} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <div className="flex justify-between">
                    <p className="font-medium text-gray-900 dark:text-slate-100">{lr.test_type}</p>
                    <span className="text-sm text-gray-500 dark:text-slate-400">{new Date(lr.created_at).toLocaleDateString("es-CL")}</span>
                  </div>
                  {lr.results && <pre className="mt-2 rounded bg-gray-50 dark:bg-slate-900 p-2 text-xs text-gray-600 dark:text-slate-400 overflow-auto">{JSON.stringify(lr.results, null, 2)}</pre>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal open={showVacModal} onClose={() => setShowVacModal(false)} title="Registrar Vacuna">
        <form onSubmit={handleVaccination} className="space-y-4">
          <Input label="Vacuna" required value={vacForm.vaccine_name} onChange={(e) => setVacForm({ ...vacForm, vaccine_name: e.target.value })} />
          <Input label="N° Lote" value={vacForm.batch_number} onChange={(e) => setVacForm({ ...vacForm, batch_number: e.target.value })} />
          <Input label="Próxima dosis" type="date" value={vacForm.next_dose_date} onChange={(e) => setVacForm({ ...vacForm, next_dose_date: e.target.value })} />
          {vacError && <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">{vacError}</p>}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowVacModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={vacSaving}>{vacSaving ? "Guardando..." : "Registrar"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showConsModal} onClose={() => setShowConsModal(false)} title="Nueva Consulta" size="lg">
        <form onSubmit={handleConsultation} className="space-y-4">
          <Input label="Motivo de consulta" value={consForm.reason} onChange={(e) => setConsForm({ ...consForm, reason: e.target.value })} />
          <Textarea label="Diagnóstico" value={consForm.diagnosis} onChange={(e) => setConsForm({ ...consForm, diagnosis: e.target.value })} />
          <Textarea label="Tratamiento" value={consForm.treatment} onChange={(e) => setConsForm({ ...consForm, treatment: e.target.value })} />
          <Textarea label="Notas" value={consForm.notes} onChange={(e) => setConsForm({ ...consForm, notes: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Peso en visita (kg)" type="number" step="0.1" value={consForm.weight_at_visit} onChange={(e) => setConsForm({ ...consForm, weight_at_visit: e.target.value })} />
            <Input label="Temperatura (°C)" type="number" step="0.1" value={consForm.temperature} onChange={(e) => setConsForm({ ...consForm, temperature: e.target.value })} />
          </div>
          {consError && <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">{consError}</p>}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowConsModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={consSaving}>{consSaving ? "Guardando..." : "Registrar consulta"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showPrescModal} onClose={() => setShowPrescModal(false)} title="Nueva Receta">
        <form onSubmit={handlePrescription} className="space-y-4">
          <Select
            label="Consulta asociada"
            required
            value={prescForm.consultation_id}
            onChange={(e) => setPrescForm({ ...prescForm, consultation_id: e.target.value })}
            options={patientConsultations.map((c) => ({
              value: c.id,
              label: `${new Date(c.created_at).toLocaleDateString("es-CL")} — ${c.reason || c.diagnosis || "Sin motivo"}`,
            }))}
          />
          <Input label="Medicamento" required value={prescForm.medication} onChange={(e) => setPrescForm({ ...prescForm, medication: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Dosis" value={prescForm.dosage} onChange={(e) => setPrescForm({ ...prescForm, dosage: e.target.value })} placeholder="Ej: 5mg" />
            <Input label="Frecuencia" value={prescForm.frequency} onChange={(e) => setPrescForm({ ...prescForm, frequency: e.target.value })} placeholder="Ej: Cada 8 horas" />
          </div>
          <Input label="Duración" value={prescForm.duration} onChange={(e) => setPrescForm({ ...prescForm, duration: e.target.value })} placeholder="Ej: 7 días" />
          <Textarea label="Notas" value={prescForm.notes} onChange={(e) => setPrescForm({ ...prescForm, notes: e.target.value })} />
          {prescError && <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">{prescError}</p>}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowPrescModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={prescSaving}>{prescSaving ? "Guardando..." : "Guardar receta"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showLabModal} onClose={() => setShowLabModal(false)} title="Agregar Resultado de Laboratorio">
        <form onSubmit={handleLabResult} className="space-y-4">
          <Input label="Tipo de examen" required value={labForm.test_type} onChange={(e) => setLabForm({ ...labForm, test_type: e.target.value })} placeholder="Ej: Hemograma, Uroanálisis..." />
          <Textarea
            label="Resultados"
            value={labForm.results_text}
            onChange={(e) => setLabForm({ ...labForm, results_text: e.target.value })}
            placeholder="Descripción de resultados o JSON estructurado"
            rows={4}
          />
          {labError && <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">{labError}</p>}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowLabModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={labSaving}>{labSaving ? "Guardando..." : "Guardar resultado"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
