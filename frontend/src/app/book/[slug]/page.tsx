"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { bookingApi } from "@/lib/public-api";
import { PublicTenantInfo, Service } from "@/types";
import { Calendar, Clock, MapPin, Phone, Mail, ChevronRight } from "lucide-react";

export default function BookingLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [tenant, setTenant] = useState<PublicTenantInfo | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([bookingApi.getTenantInfo(slug), bookingApi.getServices(slug)])
      .then(([t, s]) => {
        setTenant(t);
        setServices(s);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !tenant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 text-center px-4">
        <div className="text-6xl mb-4">🐾</div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-2">Clínica no encontrada</h1>
        <p className="text-gray-500 dark:text-slate-400">La dirección que ingresaste no corresponde a ninguna clínica registrada.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm dark:shadow-slate-900/50 border-b border-transparent dark:border-slate-700">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          {tenant.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 text-xl font-bold">
              {tenant.name[0]}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">{tenant.name}</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">Portal de reservas</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Datos de contacto */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-transparent dark:border-slate-700 p-5 space-y-2">
          {tenant.address && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
              <MapPin className="h-4 w-4 text-primary-500 shrink-0" />
              <span>{tenant.address}</span>
            </div>
          )}
          {tenant.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
              <Phone className="h-4 w-4 text-primary-500 shrink-0" />
              <span>{tenant.phone}</span>
            </div>
          )}
          {tenant.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
              <Mail className="h-4 w-4 text-primary-500 shrink-0" />
              <span>{tenant.email}</span>
            </div>
          )}
        </div>

        {/* CTA principal */}
        <div className="bg-primary-600 rounded-xl p-6 text-white text-center">
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-80" />
          <h2 className="text-2xl font-bold mb-1">Reserva tu hora</h2>
          <p className="text-primary-100 text-sm mb-5">
            Elige el servicio, veterinario, fecha y hora que más te acomode.
          </p>
          <button
            onClick={() => router.push(`/book/${slug}/book`)}
            className="bg-white text-primary-600 font-semibold px-8 py-3 rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-2 mx-auto"
          >
            Agendar cita
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Servicios disponibles */}
        {services.length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-gray-700 dark:text-slate-300 mb-3">Servicios disponibles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-slate-700 cursor-pointer hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
                  onClick={() => router.push(`/book/${slug}/book?service_id=${svc.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">{svc.name}</p>
                      {svc.description && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">{svc.description}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 dark:text-slate-500 shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      {svc.duration_minutes} min
                    </span>
                    {svc.price && (
                      <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                        ${Number(svc.price).toLocaleString("es-CL")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Link portal */}
        <div className="text-center">
          <button
            onClick={() => router.push(`/book/${slug}/portal`)}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            ¿Ya tienes citas? Accede a tu historial →
          </button>
        </div>
      </main>
    </div>
  );
}
