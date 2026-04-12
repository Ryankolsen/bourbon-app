import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { buildBourbonSearchFilter } from "@/lib/bourbons";

export function useBourbons(search?: string) {
  return useQuery({
    queryKey: ["bourbons", search],
    queryFn: async () => {
      let query = supabase
        .from("bourbons")
        .select("*")
        .order("name");

      const filter = buildBourbonSearchFilter(search);
      if (filter) {
        query = query.ilike("name", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useBourbon(id: string | undefined) {
  return useQuery({
    queryKey: ["bourbon", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("bourbons")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
