import { create } from "zustand";

// Contexto de la reserva directa desde el perfil de un profesional, que
// atraviesa tres pantallas: agenda -> resumen -> pago.
//
// Por qué un store y no parámetros de ruta: son ocho datos, dos de ellos
// (precio y duración) vienen del endpoint de disponibilidad y no deben
// poder editarse desde la URL. Pasarlos por query string permitiría abrir
// el pago con un precio distinto al que el server va a cobrar.
//
// Lo que el store NO guarda: el monto final y el estado de la reserva.
// Esos los manda el server (`POST /bookings/direct` devuelve la reserva
// real), justamente para que la pantalla de pago no muestre un número que
// el backend no respalda.
export interface DirectBookingDraft {
  professionalId: string;
  professionalName: string;
  professionalAvatarUrl: string | null;
  professionalRating: number | null;
  serviceId: number;
  serviceName: string;
  /** Precio publicado del servicio, en pesos. El server lo revalida. */
  price: number;
  durationMinutes: number;
  comunaId: number | null;
  comunaName: string | null;
  careRecipientId: string | null;
  careRecipientName: string | null;
  /** Fecha civil AAAA-MM-DD. Nunca un Date: ver packages/shared/src/dates. */
  date: string | null;
  /** Hora de pared HH:mm en horario de Chile. */
  time: string | null;
  /** Id real devuelto por el server al crear la reserva provisional. */
  bookingId: string | null;
  /** Clave de idempotencia del intento: se genera UNA vez y se reenvía en cada reintento. */
  idempotencyKey: string | null;
}

interface DirectBookingState {
  draft: DirectBookingDraft | null;
  start: (draft: Omit<DirectBookingDraft, "date" | "time" | "bookingId" | "idempotencyKey">) => void;
  setSchedule: (date: string, time: string) => void;
  setComuna: (comunaId: number, comunaName: string) => void;
  /**
   * Precio y duración reales del servicio, tal como los devuelve
   * `GET /professionals/:id/availability`. El perfil público conoce el
   * precio pero no la duración, y `POST /bookings/direct` valida el
   * horario contra la duración exacta: si no se sincroniza, la reserva
   * se rechaza por "sin disponibilidad" aunque el slot exista.
   */
  setServiceTerms: (price: number, durationMinutes: number) => void;
  setBooking: (bookingId: string) => void;
  clear: () => void;
}

// La clave tiene que sobrevivir a un reintento del usuario pero no a un
// intento nuevo. Se genera al empezar el flujo y se descarta al limpiarlo.
function newIdempotencyKey() {
  return `dbk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useDirectBookingStore = create<DirectBookingState>()((set) => ({
  draft: null,
  start: (draft) =>
    set({
      draft: { ...draft, date: null, time: null, bookingId: null, idempotencyKey: newIdempotencyKey() },
    }),
  setSchedule: (date, time) =>
    set((state) => (state.draft ? { draft: { ...state.draft, date, time, bookingId: null } } : state)),
  setComuna: (comunaId, comunaName) =>
    set((state) => (state.draft ? { draft: { ...state.draft, comunaId, comunaName } } : state)),
  setServiceTerms: (price, durationMinutes) =>
    set((state) =>
      state.draft && (state.draft.price !== price || state.draft.durationMinutes !== durationMinutes)
        ? { draft: { ...state.draft, price, durationMinutes } }
        : state
    ),
  setBooking: (bookingId) => set((state) => (state.draft ? { draft: { ...state.draft, bookingId } } : state)),
  clear: () => set({ draft: null }),
}));
