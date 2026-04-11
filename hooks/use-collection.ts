import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";

type CollectionRow = Database["public"]["Tables"]["user_collection"]["Row"];
type CollectionInsert = Database["public"]["Tables"]["user_collection"]["Insert"];

export function useCollection(userId: string | undefined) {
  return useQuery({
    queryKey: ["collection", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_collection")
        .select(`*, bourbons(*)`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Collection query error:", JSON.stringify(error));
        throw error;
      }
      return data;
    },
    enabled: !!userId,
  });
}

export function useAddToCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: CollectionInsert) => {
      const { data, error } = await supabase
        .from("user_collection")
        .insert(entry)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["collection", data.user_id] });
    },
  });
}

export function useUpdateBottleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      userId,
      bottle_status,
    }: {
      id: string;
      userId: string;
      bottle_status: CollectionRow["bottle_status"];
    }) => {
      const { data, error } = await supabase
        .from("user_collection")
        .update({ bottle_status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { data, userId };
    },
    onSuccess: ({ userId }) => {
      qc.invalidateQueries({ queryKey: ["collection", userId] });
    },
  });
}
