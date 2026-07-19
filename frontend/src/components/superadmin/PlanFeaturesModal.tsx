"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Plan } from "@/types";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";

interface Feature {
  id: string;
  key: string;
  name: string;
  description?: string;
}

interface PlanFeaturesModalProps {
  open: boolean;
  plan: Plan | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PlanFeaturesModal({ open, plan, onClose, onSuccess }: PlanFeaturesModalProps) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [assignedFeatures, setAssignedFeatures] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && plan) {
      loadData();
    }
  }, [open, plan]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [featuresRes, planFeaturesRes] = await Promise.all([
        api.get("/subscriptions/features/"),
        api.get(`/subscriptions/plans/${plan!.id}/features`),
      ]);

      setFeatures(featuresRes.data);
      const assigned = new Set(planFeaturesRes.data.features.map((f: Feature) => f.key));
      setAssignedFeatures(assigned);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Error al cargar features");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (featureKey: string, isAssigned: boolean) => {
    if (!plan) return;

    setSaving(true);
    setError("");
    try {
      if (isAssigned) {
        await api.delete(`/subscriptions/plans/${plan.id}/features/${featureKey}`);
        setAssignedFeatures((prev) => {
          const next = new Set(prev);
          next.delete(featureKey);
          return next;
        });
      } else {
        await api.post(`/subscriptions/plans/${plan.id}/features/${featureKey}`);
        setAssignedFeatures((prev) => new Set(prev).add(featureKey));
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Error al actualizar feature");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Features - ${plan?.name || ""}`}>
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {loading ? (
          <p className="text-gray-500 dark:text-slate-400">Cargando features...</p>
        ) : features.length === 0 ? (
          <p className="text-gray-500 dark:text-slate-400">No hay features disponibles.</p>
        ) : (
          <div className="space-y-3">
            {features.map((feature) => {
              const isAssigned = assignedFeatures.has(feature.key);
              return (
                <label
                  key={feature.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    checked={isAssigned}
                    onChange={() => handleToggle(feature.key, isAssigned)}
                    disabled={saving}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-slate-100">{feature.name}</p>
                    {feature.description && (
                      <p className="text-sm text-gray-500 dark:text-slate-400">{feature.description}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
