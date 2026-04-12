import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";

type WishlistRow = Database["public"]["Tables"]["user_wishlist"]["Row"];
type WishlistInsert = Database["public"]["Tables"]["user_wishlist"]["Insert"];

export function useWishlist(userId: string | undefined) {
  return useQuery({
    queryKey: ["wishlist", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_wishlist")
        .select(`*, bourbons(*)`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Wishlist query error:", JSON.stringify(error));
        throw error;
      }
      return data;
    },
    enabled: !!userId,
  });
}

export function useIsWishlisted(
  userId: string | undefined,
  bourbonId: string | undefined
) {
  return useQuery({
    queryKey: ["wishlist-item", userId, bourbonId],
    queryFn: async () => {
      if (!userId || !bourbonId) return null;
      const { data, error } = await supabase
        .from("user_wishlist")
        .select("id")
        .eq("user_id", userId)
        .eq("bourbon_id", bourbonId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!bourbonId,
  });
}

export function useAddToWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: WishlistInsert) => {
      const { data, error } = await supabase
        .from("user_wishlist")
        .insert(entry)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["wishlist", data.user_id] });
      qc.invalidateQueries({
        queryKey: ["wishlist-item", data.user_id, data.bourbon_id],
      });
    },
  });
}

export function useRemoveFromWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      userId,
      bourbonId,
    }: {
      id: string;
      userId: string;
      bourbonId: string;
    }) => {
      const { error } = await supabase
        .from("user_wishlist")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { userId, bourbonId };
    },
    onSuccess: ({ userId, bourbonId }) => {
      qc.invalidateQueries({ queryKey: ["wishlist", userId] });
      qc.invalidateQueries({
        queryKey: ["wishlist-item", userId, bourbonId],
      });
    },
  });
}
