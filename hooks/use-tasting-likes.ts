import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { buildLikePayload, buildUnlikeTarget } from "@/lib/tasting-likes";

/** Whether the current user has liked a specific tasting */
export function useIsLiked(
  userId: string | undefined,
  tastingId: string | undefined,
) {
  return useQuery({
    queryKey: ["is-liked", userId, tastingId],
    queryFn: async () => {
      if (!userId || !tastingId) return false;
      const { data, error } = await supabase
        .from("tasting_likes")
        .select("user_id")
        .eq("user_id", userId)
        .eq("tasting_id", tastingId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!userId && !!tastingId,
  });
}

/** Total like count for a specific tasting */
export function useLikeCount(tastingId: string | undefined) {
  return useQuery({
    queryKey: ["like-count", tastingId],
    queryFn: async () => {
      if (!tastingId) return 0;
      const { count, error } = await supabase
        .from("tasting_likes")
        .select("*", { count: "exact", head: true })
        .eq("tasting_id", tastingId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!tastingId,
  });
}

/** Mutation: like a tasting (insert into tasting_likes) */
export function useLikeTasting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      tastingId,
    }: {
      userId: string;
      tastingId: string;
    }) => {
      const { error } = await supabase
        .from("tasting_likes")
        .insert(buildLikePayload(userId, tastingId));
      if (error) throw error;
      return { userId, tastingId };
    },
    onSuccess: ({ userId, tastingId }) => {
      qc.invalidateQueries({ queryKey: ["is-liked", userId, tastingId] });
      qc.invalidateQueries({ queryKey: ["like-count", tastingId] });
    },
  });
}

/** Mutation: unlike a tasting (delete from tasting_likes) */
export function useUnlikeTasting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      tastingId,
    }: {
      userId: string;
      tastingId: string;
    }) => {
      const target = buildUnlikeTarget(userId, tastingId);
      const { error } = await supabase
        .from("tasting_likes")
        .delete()
        .eq("user_id", target.user_id)
        .eq("tasting_id", target.tasting_id);
      if (error) throw error;
      return { userId, tastingId };
    },
    onSuccess: ({ userId, tastingId }) => {
      qc.invalidateQueries({ queryKey: ["is-liked", userId, tastingId] });
      qc.invalidateQueries({ queryKey: ["like-count", tastingId] });
    },
  });
}
