import { create } from "zustand";

// professional_profiles.profession_id es NOT NULL en la base — no se
// puede crear la fila con solo los datos personales (paso 1). Este
// store guarda esos datos en memoria SOLO hasta que el paso 2
// (profesión) también esté listo, momento en el que ambos se escriben
// juntos en un único insert real (ver onboarding/profession.tsx). No es
// persistencia — si el usuario cierra la app entre el paso 1 y el 2 sin
// llegar a guardar, tiene que reingresar el nombre; una vez creada la
// fila, todo lo demás se resuelve contra Supabase, no contra este store.
//
// Nombres en snake_case a propósito: coinciden con
// professionalOnboardingPersonalSchema (packages/shared) y con las
// columnas reales de professional_profiles, sin capa de traducción.
interface OnboardingDraftState {
  full_name: string;
  base_comuna_id: number | null;
  setPersonal: (data: { full_name: string; base_comuna_id: number }) => void;
  reset: () => void;
}

export const useOnboardingDraftStore = create<OnboardingDraftState>()((set) => ({
  full_name: "",
  base_comuna_id: null,
  setPersonal: ({ full_name, base_comuna_id }) => set({ full_name, base_comuna_id }),
  reset: () => set({ full_name: "", base_comuna_id: null }),
}));
