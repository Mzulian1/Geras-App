import { create } from "zustand";

// Profesionales marcados como favoritos desde la lista de resultados.
//
// Selección de sesión, NO persistida y NO enviada al servidor: no existe
// una tabla de favoritos en el esquema, y crear una sería tocar la base
// (fuera del alcance de un trabajo de interfaz). Sirve para que la
// familia marque candidatos mientras compara dentro de la misma sesión de
// búsqueda, que es el uso real del corazón en la tarjeta.
//
// Cuando exista `family_favorites` en la base, este store pasa a ser el
// caché optimista de esa tabla y la firma no cambia.
interface FavoriteProfessionalsState {
  favorites: string[];
  toggle: (professionalId: string) => void;
  isFavorite: (professionalId: string) => boolean;
}

export const useFavoriteProfessionalsStore = create<FavoriteProfessionalsState>()((set, get) => ({
  favorites: [],
  toggle: (professionalId) =>
    set((state) => ({
      favorites: state.favorites.includes(professionalId)
        ? state.favorites.filter((id) => id !== professionalId)
        : [...state.favorites, professionalId],
    })),
  isFavorite: (professionalId) => get().favorites.includes(professionalId),
}));
