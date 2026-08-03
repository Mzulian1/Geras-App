import { create } from "zustand";

// Vista de una reserva recién creada, armada con datos que
// requests/new.tsx YA tiene en memoria al confirmar (profesional,
// servicio, persona mayor, comuna) — se guarda acá justo antes de
// navegar para que la pantalla de confirmación pueda renderizarse de
// inmediato con esto, sin depender de que una segunda lectura (RLS,
// vía Supabase directo) resuelva primero. `useBooking` sigue
// consultando y reemplaza estos datos en cuanto llega — esto es solo
// el placeholder inicial para no mostrar "No encontramos esta reserva"
// por una condición temporal.
export interface LastBookingView {
  id: string;
  status: string;
  price: number;
  platformFee: number;
  scheduledAt: string;
  durationMinutes: number;
  professionalFullName: string;
  professionalPhotoUrl: string | null;
  serviceName: string;
  recipientFullName: string | null;
  comunaName: string | null;
}

interface LastBookingViewState {
  byId: Record<string, LastBookingView>;
  setBookingView: (view: LastBookingView) => void;
}

export const useLastBookingViewStore = create<LastBookingViewState>()((set) => ({
  byId: {},
  setBookingView: (view) => set((state) => ({ byId: { ...state.byId, [view.id]: view } })),
}));
