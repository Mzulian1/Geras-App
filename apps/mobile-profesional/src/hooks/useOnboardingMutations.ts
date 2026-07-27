import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { callServerApi } from "@/lib/apiClient";
import { uploadProfessionalDocument, type PickedFile } from "@/lib/professionalStorage";
import type {
  DocumentType,
  ProfessionalAvailabilityBlockInput,
  ProfessionalOnboardingExperienceInput,
  ProfessionalServiceInput,
} from "@geras/shared";

function invalidateProfile(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["professional-profile"] });
}

// Pasos 1+2 (datos personales + profesión): único INSERT/UPDATE real de
// professional_profiles. `onConflict: "user_id"` cubre tanto la primera
// creación como volver después a editar nombre/comuna/profesión.
export function useSaveProfessionalIdentity(businessUserId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { full_name: string; base_comuna_id: number; profession_id: number }) => {
      if (!businessUserId) throw new Error("Todavía no se resolvió tu usuario. Intenta de nuevo en un momento.");
      const { data, error } = await supabase
        .from("professional_profiles")
        .upsert({ user_id: businessUserId, ...input }, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateProfile(queryClient),
  });
}

// Si el profesional cambia de profesión después de haber elegido
// servicios de la profesión anterior, esos servicios quedan
// inconsistentes (pertenecen a una profesión que ya no es la suya) —
// se limpian para que el paso 4 arranque de nuevo con el catálogo correcto.
export function useClearProfessionalServices(professionalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!professionalId) return;
      const { error } = await supabase.from("professional_services").delete().eq("professional_id", professionalId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["onboarding-services", professionalId] }),
  });
}

// Paso 3: experiencia y descripción.
export function useUpdateProfessionalExperience(professionalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProfessionalOnboardingExperienceInput) => {
      if (!professionalId) throw new Error("Todavía no creaste tu perfil profesional.");
      const { error } = await supabase.from("professional_profiles").update(input).eq("id", professionalId);
      if (error) throw error;
    },
    onSuccess: () => invalidateProfile(queryClient),
  });
}

// Paso 4: qué servicios ofrece y con qué modalidad. Solo agrega/quita
// filas — si un (service_id, modality) ya existía, no se toca su precio
// (lo administra el paso 5, para no pisar un precio ya editado al volver
// a este paso).
export function useSyncOfferedServices(professionalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (selections: { service_id: number; modality: ProfessionalServiceInput["modality"]; defaultPrice: number }[]) => {
      if (!professionalId) throw new Error("Todavía no creaste tu perfil profesional.");

      const { data: existing, error: fetchError } = await supabase
        .from("professional_services")
        .select("id, service_id, modality")
        .eq("professional_id", professionalId);
      if (fetchError) throw fetchError;

      const existingKeys = new Set((existing ?? []).map((row) => `${row.service_id}:${row.modality}`));
      const selectedKeys = new Set(selections.map((s) => `${s.service_id}:${s.modality}`));

      const toDeleteIds = (existing ?? [])
        .filter((row) => !selectedKeys.has(`${row.service_id}:${row.modality}`))
        .map((row) => row.id);
      const toInsert = selections.filter((s) => !existingKeys.has(`${s.service_id}:${s.modality}`));

      if (toDeleteIds.length > 0) {
        const { error } = await supabase.from("professional_services").delete().in("id", toDeleteIds);
        if (error) throw error;
      }
      if (toInsert.length > 0) {
        const { error } = await supabase.from("professional_services").insert(
          toInsert.map((s) => ({
            professional_id: professionalId,
            service_id: s.service_id,
            modality: s.modality,
            price: s.defaultPrice,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["onboarding-services", professionalId] }),
  });
}

// Paso 5: precio final por servicio ya seleccionado.
export function useUpdateServicePrice(professionalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const { error } = await supabase.from("professional_services").update({ price }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["onboarding-services", professionalId] }),
  });
}

// Paso 6: comunas de cobertura (sync por diferencia contra lo existente).
export function useSyncProfessionalCoverage(professionalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (comunaIds: number[]) => {
      if (!professionalId) throw new Error("Todavía no creaste tu perfil profesional.");

      const { data: existing, error: fetchError } = await supabase
        .from("professional_coverage")
        .select("id, comuna_id")
        .eq("professional_id", professionalId);
      if (fetchError) throw fetchError;

      const selected = new Set(comunaIds);
      const existingComunaIds = new Set((existing ?? []).map((row) => row.comuna_id));

      const toDeleteIds = (existing ?? []).filter((row) => !selected.has(row.comuna_id)).map((row) => row.id);
      const toInsert = comunaIds.filter((id) => !existingComunaIds.has(id));

      if (toDeleteIds.length > 0) {
        const { error } = await supabase.from("professional_coverage").delete().in("id", toDeleteIds);
        if (error) throw error;
      }
      if (toInsert.length > 0) {
        const { error } = await supabase
          .from("professional_coverage")
          .insert(toInsert.map((comuna_id) => ({ professional_id: professionalId, comuna_id })));
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["onboarding-coverage", professionalId] }),
  });
}

// Paso 7: disponibilidad semanal. Reemplazo completo — la pantalla
// siempre manda el horario semanal entero, no ediciones incrementales.
export function useSyncProfessionalAvailability(professionalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (blocks: ProfessionalAvailabilityBlockInput[]) => {
      if (!professionalId) throw new Error("Todavía no creaste tu perfil profesional.");

      const { error: deleteError } = await supabase
        .from("professional_availability")
        .delete()
        .eq("professional_id", professionalId);
      if (deleteError) throw deleteError;

      if (blocks.length > 0) {
        const { error } = await supabase
          .from("professional_availability")
          .insert(blocks.map((block) => ({ professional_id: professionalId, ...block })));
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["onboarding-availability", professionalId] }),
  });
}

// Paso 8: subir un documento. El trigger force_professional_document_pending
// (migración 017) fuerza status='pending' en la base sin importar lo que
// se mande acá — no hace falta (ni se puede) pedir otro estado.
export function useUploadProfessionalDocument(professionalId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentType, file }: { documentType: DocumentType; file: PickedFile }) => {
      if (!professionalId) throw new Error("Todavía no creaste tu perfil profesional.");
      const path = await uploadProfessionalDocument(professionalId, documentType, file);
      const { error } = await supabase
        .from("professional_documents")
        .insert({ professional_id: professionalId, document_type: documentType, file_url: path });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["onboarding-documents", professionalId] }),
  });
}

// Paso 10: envío a validación. Es la única operación "sensible" del
// wizard — professional_profiles.active está protegido por un trigger
// que ni el dueño del perfil puede saltarse vía RLS (migración 017), así
// que pasa por el server (service_role), que además vuelve a validar la
// completitud del lado del servidor antes de activar.
export function useSubmitForReview() {
  return useMutation({
    mutationFn: () => callServerApi<{ submitted: boolean }>("/api/v1/professional/submit-for-review", { method: "POST" }),
  });
}
