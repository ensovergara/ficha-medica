"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Button from "@/components/ui/button";

interface AuditEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  created_at: string;
}

const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  login: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const LIMIT = 50;

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = async (s = 0, append = false) => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports/audit-log", { params: { skip: s, limit: LIMIT } });
      if (append) {
        setLogs((prev) => [...prev, ...data]);
      } else {
        setLogs(data);
      }
      setHasMore(data.length === LIMIT);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(0); }, []);

  const loadMore = () => {
    const newSkip = skip + LIMIT;
    setSkip(newSkip);
    fetchLogs(newSkip, true);
  };

  const formatAction = (action: string) => action.replace(/_/g, " ");
  const actionColor = (action: string) => {
    const key = Object.keys(actionColors).find((k) => action.includes(k));
    return key ? actionColors[key] : "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300";
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Registro de Auditoría</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Historial de acciones realizadas en el sistema</p>
        </div>
        <Button variant="secondary" onClick={() => { setSkip(0); fetchLogs(0); }}>Actualizar</Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Fecha y hora</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Acción</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Recurso</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">ID Recurso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {loading && logs.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">Cargando...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">Sin registros de auditoría</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("es-CL")}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${actionColor(log.action)}`}>
                      {formatAction(log.action)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-slate-300 capitalize">{log.resource_type?.replace(/_/g, " ") || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-400 dark:text-slate-500 font-mono">{log.resource_id ? log.resource_id.substring(0, 8) + "..." : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {hasMore && (
          <div className="flex justify-center border-t border-gray-200 dark:border-slate-700 p-4">
            <Button variant="secondary" onClick={loadMore} disabled={loading}>
              {loading ? "Cargando..." : "Cargar más"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
