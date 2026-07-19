import { useEffect, useState } from "react";
import api from "@/lib/api";

export function useFeatureAccess(featureKey: string) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(`/subscriptions/my-subscription/has-feature/${featureKey}`);
        setHasAccess(data.has_access);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Error al verificar acceso");
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [featureKey]);

  return { hasAccess, loading, error };
}
