export interface User {
  id: string;
  tenant_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  role: "superadmin" | "admin" | "veterinario" | "recepcionista" | "auxiliar";
  is_active: boolean;
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  tenant_id: string;
  rut: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
}

export interface Patient {
  id: string;
  tenant_id: string;
  client_id: string;
  name: string;
  species: string;
  breed: string | null;
  birth_date: string | null;
  sex: string | null;
  weight: number | null;
  microchip: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MedicalRecord {
  id: string;
  tenant_id: string;
  patient_id: string;
  record_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface Consultation {
  id: string;
  tenant_id: string;
  medical_record_id: string;
  veterinarian_id: string;
  reason: string | null;
  diagnosis: string | null;
  treatment: string | null;
  notes: string | null;
  weight_at_visit: number | null;
  temperature: number | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  patient_id: string;
  client_id: string;
  veterinarian_id: string;
  service_id: string | null;
  date: string;
  start_time: string;
  end_time: string | null;
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled";
  source: "INTERNAL" | "PORTAL";
  reason: string | null;
  notes: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  category: string | null;
  sku: string | null;
  unit: string | null;
  stock_quantity: number;
  min_stock: number;
  price: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  client_id: string;
  invoice_number: string;
  subtotal: number;
  tax: number;
  total: number;
  status: "draft" | "issued" | "paid" | "cancelled";
  issued_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  max_users: number;
  max_patients: number | null;
  features: Record<string, boolean>;
  price_monthly: number;
  price_yearly: number;
  is_active: boolean;
}

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  is_active: boolean;
  created_at: string;
}

export interface VeterinarianSchedule {
  id: string;
  tenant_id: string;
  veterinarian_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface ScheduleException {
  id: string;
  tenant_id: string;
  veterinarian_id: string;
  exception_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

export interface AvailableSlot {
  start_time: string;
  end_time: string;
}

// Portal público
export interface PublicTenantInfo {
  id: string;
  name: string;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface PublicVet {
  id: string;
  first_name: string;
  last_name: string;
}

export interface PublicAppointment {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  status: string;
  service_name: string | null;
  vet_name: string;
  pet_name: string;
}
