import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { buildCommentPayload } from '@/lib/tasting-comments';
import { Database } from '@/types/database';

type CommentRow = Database['public']['Tables']['tasting_comments']['Row'];

export interface TastingComment extends CommentRow {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

/** All comments for a tasting, ordered oldest-first, with profile data joined */
export function useTastingComments(tastingId: string | undefined) {
  return useQuery({
    queryKey: ['tasting-comments', tastingId],
    queryFn: async (): Promise<TastingComment[]> => {
      if (!tastingId) return [];
      const { data, error } = await supabase
        .from('tasting_comments')
        .select('*, profiles!tasting_comments_user_id_fkey(display_name, username, avatar_url)')
        .eq('tasting_id', tastingId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((row: any): TastingComment => ({
        id: row.id,
        tasting_id: row.tasting_id,
        user_id: row.user_id,
        body: row.body,
        created_at: row.created_at,
        display_name: row.profiles?.display_name ?? null,
        username: row.profiles?.username ?? null,
        avatar_url: row.profiles?.avatar_url ?? null,
      }));
    },
    enabled: !!tastingId,
  });
}

/** Total comment count for a tasting */
export function useCommentCount(tastingId: string | undefined) {
  return useQuery({
    queryKey: ['comment-count', tastingId],
    queryFn: async () => {
      if (!tastingId) return 0;
      const { count, error } = await supabase
        .from('tasting_comments')
        .select('*', { count: 'exact', head: true })
        .eq('tasting_id', tastingId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!tastingId,
  });
}

/** Mutation: post a comment (insert into tasting_comments) */
export function usePostComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      tastingId,
      body,
    }: {
      userId: string;
      tastingId: string;
      body: string;
    }) => {
      const { error } = await supabase
        .from('tasting_comments')
        .insert(buildCommentPayload(userId, tastingId, body));
      if (error) throw error;
      return { tastingId };
    },
    onSuccess: ({ tastingId }) => {
      qc.invalidateQueries({ queryKey: ['tasting-comments', tastingId] });
      qc.invalidateQueries({ queryKey: ['comment-count', tastingId] });
    },
  });
}

/**
 * Realtime subscription: appends new comments for a tasting via onInsert callback.
 * Caller is responsible for prepending/appending to local state.
 */
export function useTastingCommentsRealtime(
  tastingId: string | undefined,
  onInsert: (comment: CommentRow) => void,
) {
  useEffect(() => {
    if (!tastingId) return;
    const channel = supabase
      .channel(`tasting-comments:${tastingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasting_comments',
          filter: `tasting_id=eq.${tastingId}`,
        },
        (payload) => onInsert(payload.new as CommentRow),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tastingId, onInsert]);
}
