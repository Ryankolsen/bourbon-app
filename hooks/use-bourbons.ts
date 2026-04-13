import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { buildBourbonSearchFilter } from "@/lib/bourbons";
import { Database } from "@/types/database";

type BourbonInsert = Database["public"]["Tables"]["bourbons"]["Insert"];
type BourbonRow = Database["public"]["Tables"]["bourbons"]["Row"];

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

export function useAddBourbon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BourbonInsert) => {
      const { data, error } = await supabase
        .from("bourbons")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as BourbonRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bourbons"] });
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
