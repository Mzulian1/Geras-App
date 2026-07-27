import { create } from "zustand";

// Para quién se está buscando un profesional — selección de sesión,
// no persistida en Supabase: no se crea ninguna solicitud/reserva en
// esta tarea, es solo contexto de navegación entre home y professionals.
interface SelectedRecipientState {
  selectedRecipientId: string | null;
  setSelectedRecipientId: (id: string | null) => void;
}

export const useSelectedRecipientStore = create<SelectedRecipientState>()((set) => ({
  selectedRecipientId: null,
  setSelectedRecipientId: (id) => set({ selectedRecipientId: id }),
}));
