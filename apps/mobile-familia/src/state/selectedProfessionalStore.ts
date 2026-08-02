import { create } from "zustand";

// Profesional elegido desde su perfil público — selección de sesión, no
// persistida. Junto con selectedServiceStore, le permite a requests/new
// saltarse el paso "Servicio" y reservar directo con este profesional en
// vez de pasar por el browse de matches (mismo patrón que los otros
// selected*Store).
interface SelectedProfessionalState {
  selectedProfessionalId: string | null;
  setSelectedProfessionalId: (id: string | null) => void;
}

export const useSelectedProfessionalStore = create<SelectedProfessionalState>()((set) => ({
  selectedProfessionalId: null,
  setSelectedProfessionalId: (id) => set({ selectedProfessionalId: id }),
}));
