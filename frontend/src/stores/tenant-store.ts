import { create } from "zustand";

interface TenantStore {
  selectedTenantId: string | null;
  setSelectedTenantId: (id: string | null) => void;
}

export const useTenantStore = create<TenantStore>((set) => ({
  selectedTenantId: typeof window !== "undefined" ? localStorage.getItem("target_tenant_id") : null,
  setSelectedTenantId: (id) => {
    if (id) {
      localStorage.setItem("target_tenant_id", id);
    } else {
      localStorage.removeItem("target_tenant_id");
    }
    set({ selectedTenantId: id });
  },
}));
