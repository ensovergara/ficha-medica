import { useFeatureAccess } from "@/hooks/useFeatureAccess";

interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  upgradeMessage?: string;
}

export default function FeatureGate({
  featureKey,
  children,
  fallback,
  upgradeMessage = "Actualiza tu plan para acceder a esta función",
}: FeatureGateProps) {
  const { hasAccess, loading } = useFeatureAccess(featureKey);

  if (loading) {
    return <div className="p-4 text-gray-500 dark:text-slate-400">Verificando acceso...</div>;
  }

  if (!hasAccess) {
    return (
      fallback || (
        <div className="p-6 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-center">
          <p className="text-gray-600 dark:text-slate-400 mb-3">{upgradeMessage}</p>
          <button className="inline-block px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition">
            Mejorar Plan
          </button>
        </div>
      )
    );
  }

  return <>{children}</>;
}
