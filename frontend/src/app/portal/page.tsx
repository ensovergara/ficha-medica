"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birth_date: string | null;
  sex: string | null;
  weight: number | null;
  vaccinations: { vaccine_name: string; date: string; next_dose: string | null }[];
}

export default function PortalPage() {
  const params = useSearchParams();
  const code = params.get("code");
  const [data, setData] = useState<{ client: any; pets: Pet[] } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) { setError("Código no proporcionado"); setLoading(false); return; }
    api.get("/portal/view", { params: { code } })
      .then(({ data }) => setData(data))
      .catch(() => setError("Código inválido o expirado"))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-900">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
    </div>
  );

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
      <div className="text-center">
        <p className="text-4xl mb-4">🔒</p>
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Acceso no válido</h1>
        <p className="mt-2 text-gray-500 dark:text-slate-400">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white dark:from-slate-900 dark:to-slate-800 py-10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <p className="text-4xl mb-2">🐾</p>
          <h1 className="text-2xl font-bold text-primary-700 dark:text-primary-400">Portal de Mascotas</h1>
          <p className="text-gray-500 dark:text-slate-400">Hola, {data?.client?.first_name} {data?.client?.last_name}</p>
        </div>

        {data?.pets.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-slate-400">No hay mascotas registradas</div>
        ) : (
          <div className="space-y-6">
            {data?.pets.map((pet) => (
              <div key={pet.id} className="rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-5">
                  <div className="h-16 w-16 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-3xl">
                    {pet.species?.toLowerCase().includes("perro") ? "🐕" : pet.species?.toLowerCase().includes("gato") ? "🐈" : "🐾"}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">{pet.name}</h2>
                    <p className="text-gray-500 dark:text-slate-400">{pet.species}{pet.breed ? ` - ${pet.breed}` : ""}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-5 text-sm">
                  {pet.birth_date && (
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                      <p className="text-gray-400 dark:text-slate-500 text-xs">Nacimiento</p>
                      <p className="font-medium text-gray-900 dark:text-slate-100">{pet.birth_date}</p>
                    </div>
                  )}
                  {pet.sex && (
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                      <p className="text-gray-400 dark:text-slate-500 text-xs">Sexo</p>
                      <p className="font-medium text-gray-900 dark:text-slate-100">{pet.sex}</p>
                    </div>
                  )}
                  {pet.weight && (
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
                      <p className="text-gray-400 dark:text-slate-500 text-xs">Peso</p>
                      <p className="font-medium text-gray-900 dark:text-slate-100">{pet.weight} kg</p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">💉 Vacunas</h3>
                  {pet.vaccinations.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-slate-500">Sin vacunas registradas</p>
                  ) : (
                    <div className="space-y-2">
                      {pet.vaccinations.map((v, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700 dark:text-slate-300">{v.vaccine_name}</span>
                          <div className="text-right text-gray-500 dark:text-slate-400">
                            <p>{new Date(v.date).toLocaleDateString("es-CL")}</p>
                            {v.next_dose && <p className="text-xs text-orange-600 dark:text-orange-400">Próxima: {v.next_dose}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-300 dark:text-slate-600 mt-10">FichaMédica SaaS Veterinario</p>
      </div>
    </div>
  );
}
