"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface SearchResult {
  id: string;
  name: string;
  type: "patient" | "client";
  species?: string;
  rut?: string;
}

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ patients: SearchResult[]; clients: SearchResult[] }>({ patients: [], clients: [] });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.length < 2) { setResults({ patients: [], clients: [] }); setOpen(false); return; }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/search/", { params: { q: query } });
        setResults(data);
        setOpen(true);
      } catch {
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  const navigate = (type: string, id: string) => {
    setQuery("");
    setOpen(false);
    if (type === "patient") router.push(`/dashboard/patients/${id}`);
    else router.push(`/dashboard/clients`);
  };

  const total = results.patients.length + results.clients.length;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar pacientes, clientes..."
          className="w-72 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 py-2 pl-9 pr-3 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:border-primary-400 focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
        {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500">...</span>}
      </div>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-80 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg dark:shadow-slate-900/50">
          {total === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400 dark:text-slate-500">Sin resultados para "{query}"</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {results.patients.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-semibold uppercase text-gray-400 dark:text-slate-500">Pacientes</p>
                  {results.patients.map((r) => (
                    <button key={r.id} onClick={() => navigate("patient", r.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <span className="text-lg">🐾</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{r.name}</p>
                        {r.species && <p className="text-xs text-gray-400 dark:text-slate-500">{r.species}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results.clients.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-semibold uppercase text-gray-400 dark:text-slate-500">Clientes</p>
                  {results.clients.map((r) => (
                    <button key={r.id} onClick={() => navigate("client", r.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <span className="text-lg">👤</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{r.name}</p>
                        {r.rut && <p className="text-xs text-gray-400 dark:text-slate-500">{r.rut}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
