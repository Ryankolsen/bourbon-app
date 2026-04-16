import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";

type CollectionInsert = Database["public"]["Tables"]["user_collection"]["Insert"];

// ---------------------------------------------------------------------------
// useCollection hook
// ---------------------------------------------------------------------------

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

export function useRemoveFromCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from("user_collection")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { userId };
    },
    onSuccess: ({ userId }) => {
      qc.invalidateQueries({ queryKey: ["collection", userId] });
    },
  });
}

