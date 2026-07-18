import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Service, Profession, Comuna } from "@geras/shared";

/**
 * Edita un servicio (nombre, descripción, rango de precio sugerido,
 * duración, activo). Los rangos de precio se reflejan de inmediato en
 * PriceRangeIndicator (detalle de profesional) porque ambos leen la
 * misma tabla, sin caché intermedio.
 */
export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (service: Partial<Service> & { id: number }) => {
      const { id, ...updates } = service;
      const { error } = await supabase.from("services").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services-with-profession"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Servicio actualizado");
    },
    onError: (error) => toast.error("No se pudo guardar el servicio", { description: error.message }),
  });
}

/** Edita una profesión (nombre, categoría, nivel de riesgo, activa). */
export function useUpdateProfession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profession: Partial<Profession> & { id: number }) => {
      const { id, ...updates } = profession;
      const { error } = await supabase.from("professions").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professions"] });
      toast.success("Profesión actualizada");
    },
    onError: (error) => toast.error("No se pudo guardar la profesión", { description: error.message }),
  });
}

/** Activa/desactiva una comuna existente. */
export function useUpdateComuna() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const { error } = await supabase.from("comunas").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comunas"] });
      toast.success("Comuna actualizada");
    },
    onError: (error) => toast.error("No se pudo guardar la comuna", { description: error.message }),
  });
}

/** Agrega una comuna nueva al catálogo. */
export function useCreateComuna() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, region }: { name: string; region: string }) => {
      const { error } = await supabase.from("comunas").insert({ name, region });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comunas"] });
      toast.success("Comuna agregada");
    },
    onError: (error) => toast.error("No se pudo agregar la comuna", { description: error.message }),
  });
}

export type { Service, Profession, Comuna };
