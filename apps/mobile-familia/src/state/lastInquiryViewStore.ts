import { create } from "zustand";

// Mismo patrón que lastBookingViewStore: la pantalla de confirmación de
// una solicitud de residencia debe poder renderizarse de inmediato con
// lo que inquiry.tsx ya tiene en memoria al confirmar, sin depender
// únicamente de que useResidenceInquiry (lectura RLS directa) resuelva
// primero.
export interface LastInquiryView {
  id: string;
  inquiryType: "information" | "visit";
  status: string;
  residenceName: string;
  recipientFullName: string | null;
  contactName: string;
  contactPhone: string;
  preferredDate: string | null;
  preferredTime: string | null;
}

interface LastInquiryViewState {
  byId: Record<string, LastInquiryView>;
  setInquiryView: (view: LastInquiryView) => void;
}

export const useLastInquiryViewStore = create<LastInquiryViewState>()((set) => ({
  byId: {},
  setInquiryView: (view) => set((state) => ({ byId: { ...state.byId, [view.id]: view } })),
}));
