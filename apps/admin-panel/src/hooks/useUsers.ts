import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@geras/shared";

export interface UserFilters {
  role?: UserRole | "all";
  search?: string;
}

/** Lista de usuarios del sistema para /usuarios (todos los roles). */
export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: ["users", filters],
    queryFn: async () => {
      let query = supabase.from("users").select("*").order("created_at", { ascending: false });
      if (filters.role && filters.role !== "all") query = query.eq("role", filters.role);
      if (filters.search) query = query.ilike("email", `%${filters.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
