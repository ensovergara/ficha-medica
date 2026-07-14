/**
 * API client para el portal público.
 * No agrega headers de auth de staff.
 * Usa un token de portal (magic link JWT) almacenado en sessionStorage.
 */

import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const publicApi = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

publicApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("portal_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Portal token helpers ─────────────────────────────────────────────────────

export function savePortalToken(token: string, clientId: string | null) {
  sessionStorage.setItem("portal_token", token);
  if (clientId) sessionStorage.setItem("portal_client_id", clientId);
}

export function getPortalToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("portal_token");
}

export function clearPortalToken() {
  sessionStorage.removeItem("portal_token");
  sessionStorage.removeItem("portal_client_id");
}

// ─── Public booking API ───────────────────────────────────────────────────────

export const bookingApi = {
  getTenantInfo: (slug: string) =>
    publicApi.get(`/public/${slug}`).then((r) => r.data),

  getServices: (slug: string) =>
    publicApi.get(`/public/${slug}/services`).then((r) => r.data),

  getVets: (slug: string, serviceId?: string) =>
    publicApi
      .get(`/public/${slug}/vets`, { params: serviceId ? { service_id: serviceId } : {} })
      .then((r) => r.data),

  getAvailability: (slug: string, vetId: string, date: string, serviceId: string) =>
    publicApi
      .get(`/public/${slug}/availability`, {
        params: { veterinarian_id: vetId, date, service_id: serviceId },
      })
      .then((r) => r.data),

  book: (slug: string, payload: Record<string, unknown>) =>
    publicApi.post(`/public/${slug}/book`, payload).then((r) => r.data),

  requestMagicLink: (slug: string, email: string) =>
    publicApi.post(`/public/${slug}/auth/magic-link`, { email }).then((r) => r.data),

  verifyMagicLink: (slug: string, token: string) =>
    publicApi.post(`/public/${slug}/auth/verify`, { token }).then((r) => r.data),

  getMyAppointments: (slug: string) =>
    publicApi.get(`/public/${slug}/portal/appointments`).then((r) => r.data),

  cancelAppointment: (slug: string, appointmentId: string) =>
    publicApi
      .patch(`/public/${slug}/portal/appointments/${appointmentId}/cancel`)
      .then((r) => r.data),
};

export default publicApi;
