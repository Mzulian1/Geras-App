import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { callServerApi } from "@/lib/apiClient";
import type { CreateResidenceInquiryInput } from "@geras/shared";

// Crear solicitud de información/visita SIEMPRE pasa por el server:
// family_user_id se fija desde el usuario autenticado (nunca del
// cliente) y el RPC revalida que la residencia siga publicada.
export function useCreateResidenceInquiry() {
  return useMutation({
    mutationFn: (input: CreateResidenceInquiryInput) =>
      callServerApi<{ inquiryId: string }>("/api/v1/residence-inquiries", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });
}

// Lectura de una sola solicitud ya creada (misma RLS que el historial)
// — para la pantalla de confirmación, que necesita mostrar residencia,
// tipo, fecha/hora, persona interesada, contacto y estado sin volver a
// pedirle esos datos al usuario ni pasar por el server.
export function useResidenceInquiry(inquiryId: string | undefined) {
  return useQuery({
    queryKey: ["residence-inquiry", inquiryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residence_inquiries")
        .select(
          "id, inquiry_type, status, preferred_date, preferred_time, contact_name, contact_phone, contact_email, residences(name), care_recipients(full_name)"
        )
        .eq("id", inquiryId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!inquiryId,
  });
}

// Historial propio (RLS residence_inquiries_select_family) — lectura
// directa, sin pasar por el server. Solo se expone `status`, nunca
// `internal_notes` (observaciones internas de Admin).
export function useMyResidenceInquiries(familyUserId: string | undefined) {
  return useQuery({
    queryKey: ["my-residence-inquiries", familyUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residence_inquiries")
        .select("id, residence_id, inquiry_type, status, created_at, preferred_date, preferred_time, residences(name)")
        .eq("family_user_id", familyUserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!familyUserId,
  });
}
