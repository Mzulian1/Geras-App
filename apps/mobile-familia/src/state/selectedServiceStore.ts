import { create } from "zustand";

// Qué servicio se tocó desde Inicio/Servicios — selección de sesión,
// no persistida, solo para preseleccionar el campo "Servicio" al
// llegar a requests/new (mismo patrón que selectedRecipientStore).
interface SelectedServiceState {
  selectedServiceId: number | null;
  setSelectedServiceId: (id: number | null) => void;
}

export const useSelectedServiceStore = create<SelectedServiceState>()((set) => ({
  selectedServiceId: null,
  setSelectedServiceId: (id) => set({ selectedServiceId: id }),
}));
