import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ResidenceInquiryStatus, ResidenceInquiryType } from "@geras/shared";

export interface ResidenceInquiryFilters {
  residenceId?: string | "all";
  status?: ResidenceInquiryStatus | "all";
  inquiryType?: ResidenceInquiryType | "all";
  comunaId?: number | "all";
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Lista de solicitudes de información/visita para /solicitudes-residencias.
 * El filtro por comuna va contra la residencia asociada (join), el resto
 * son columnas propias de residence_inquiries.
 */
export function useResidenceInquiries(filters: ResidenceInquiryFilters = {}) {
  return useQuery({
    queryKey: ["residence-inquiries", filters],
    queryFn: async () => {
      let query = supabase
        .from("residence_inquiries")
        .select("*, residences(name, comuna_id, comunas(name)), users!residence_inquiries_assigned_to_fkey(email)")
        .order("created_at", { ascending: false });

      if (filters.residenceId && filters.residenceId !== "all") query = query.eq("residence_id", filters.residenceId);
      if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
      if (filters.inquiryType && filters.inquiryType !== "all") query = query.eq("inquiry_type", filters.inquiryType);
      if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
      if (filters.dateTo) query = query.lte("created_at", filters.dateTo);

      const { data, error } = await query;
      if (error) throw error;
      const rows = filters.comunaId && filters.comunaId !== "all" ? data.filter((r) => r.residences?.comuna_id === filters.comunaId) : data;
      return rows;
    },
  });
}

export function useResidenceInquiry(id: string | undefined) {
  return useQuery({
    queryKey: ["residence-inquiry", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residence_inquiries")
        .select(
          "*, residences(id, name, comunas(name)), care_recipients(full_name), users!residence_inquiries_assigned_to_fkey(email)"
        )
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useResidenceInquiryStatusHistory(id: string | undefined) {
  return useQuery({
    queryKey: ["residence-inquiry-status-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residence_inquiry_status_history")
        .select("*, users(email)")
        .eq("inquiry_id", id!)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
