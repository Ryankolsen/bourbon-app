import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";

type TastingRow = Database["public"]["Tables"]["tastings"]["Row"];
type TastingInsert = Database["public"]["Tables"]["tastings"]["Insert"];

export function useTastings(userId: string | undefined) {
  return useQuery({
    queryKey: ["tastings", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("tastings")
        .select(`*, bourbons(*)`)
        .eq("user_id", userId)
        .order("tasted_at", { ascending: false });
      if (error) {
        console.error("Tastings query error:", JSON.stringify(error));
        throw error;
      }
      return data;
    },
    enabled: !!userId,
  });
}

export function useTastingsForBourbon(
  userId: string | undefined,
  bourbonId: string | undefined
) {
  return useQuery({
    queryKey: ["tastings", userId, bourbonId],
    queryFn: async () => {
      if (!userId || !bourbonId) return [];
      const { data, error } = await supabase
        .from("tastings")
        .select(`*`)
        .eq("user_id", userId)
        .eq("bourbon_id", bourbonId)
        .order("tasted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!bourbonId,
  });
}

export function useLogTasting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: TastingInsert) => {
      const { data, error } = await supabase
        .from("tastings")
        .insert(entry)
        .select()
        .single();
      if (error) throw error;
      return data as TastingRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tastings", data.user_id] });
    },
  });
}
