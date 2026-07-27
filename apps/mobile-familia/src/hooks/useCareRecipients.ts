import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CareRecipient, CareRecipientFormInput } from "@geras/shared";

// Todas las lecturas/escrituras son directas contra Supabase — RLS ya
// acota "solo tus propias personas" (care_recipients_select_own /
// _update_own, migración 019), no hay ninguna regla de negocio extra
// que justifique pasar por el server acá.

export function useCareRecipients(familyUserId: string | undefined) {
  return useQuery({
    queryKey: ["care-recipients", familyUserId],
    queryFn: async (): Promise<CareRecipient[]> => {
      const { data, error } = await supabase
        .from("care_recipients")
        .select("*")
        .eq("family_user_id", familyUserId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!familyUserId,
  });
}

export function useCareRecipient(id: string | undefined) {
  return useQuery({
    queryKey: ["care-recipient", id],
    queryFn: async (): Promise<CareRecipient | null> => {
      const { data, error } = await supabase.from("care_recipients").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCareRecipient(familyUserId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CareRecipientFormInput) => {
      if (!familyUserId) throw new Error("Todavía no se resolvió tu usuario. Intenta de nuevo en un momento.");
      const { data, error } = await supabase
        .from("care_recipients")
        .insert({
          family_user_id: familyUserId,
          full_name: input.full_name,
          birth_date: input.birth_date,
          relationship_to_family: input.relationship_to_family,
          mobility_level: input.mobility_level,
          general_needs: input.general_needs || null,
          comuna_id: input.comuna_id,
          emergency_contact_name: input.emergency_contact_name,
          emergency_contact_phone: input.emergency_contact_phone,
          notes: input.notes || null,
          consent_given: input.consent_given,
          consent_given_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["care-recipients", familyUserId] }),
  });
}

export function useUpdateCareRecipient(familyUserId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: CareRecipientFormInput }) => {
      // consent_given no se reenvía: ya está garantizado por el CHECK de
      // la tabla al crear, y editar no debería poder revertirlo.
      const { error } = await supabase
        .from("care_recipients")
        .update({
          full_name: input.full_name,
          birth_date: input.birth_date,
          relationship_to_family: input.relationship_to_family,
          mobility_level: input.mobility_level,
          general_needs: input.general_needs || null,
          comuna_id: input.comuna_id,
          emergency_contact_name: input.emergency_contact_name,
          emergency_contact_phone: input.emergency_contact_phone,
          notes: input.notes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["care-recipients", familyUserId] });
      queryClient.invalidateQueries({ queryKey: ["care-recipient", id] });
    },
  });
}
