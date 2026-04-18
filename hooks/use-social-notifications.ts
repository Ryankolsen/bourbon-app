import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type SocialNotificationRow = Database['public']['Tables']['social_notifications']['Row'];

export interface SocialNotification extends SocialNotificationRow {
  profiles: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

/**
 * Fetch undismissed social notifications for the given recipient.
 * Returns [] immediately when userId is undefined (no query fired).
 */
export function useSocialNotifications(userId: string | undefined) {
  return useQuery<SocialNotification[]>({
    queryKey: ['social-notifications', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('social_notifications')
        .select(
          '*, profiles!social_notifications_actor_id_fkey(display_name, username, avatar_url)'
        )
        .eq('recipient_id', userId)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []) as unknown as SocialNotification[];
    },
    enabled: !!userId,
  });
}

/**
 * Soft-dismiss a single notification by setting dismissed_at = now().
 * Applies an optimistic update so the row disappears immediately.
 */
export function useDismissSocialNotification(userId: string | undefined) {
  const qc = useQueryClient();
  const queryKey = ['social-notifications', userId];

  return useMutation({
    mutationFn: async ({ notificationId }: { notificationId: string }) => {
      const { error } = await supabase
        .from('social_notifications')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onMutate: async ({ notificationId }) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<SocialNotification[]>(queryKey);
      qc.setQueryData<SocialNotification[]>(queryKey, (old) =>
        (old ?? []).filter((n) => n.id !== notificationId)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });
}

/**
 * Subscribe to Supabase Realtime INSERT events on social_notifications
 * filtered by recipient_id. Calls onInsert with each new row.
 * No-ops when userId is undefined. Cleans up on unmount.
 */
export function useSocialNotificationsRealtime(
  userId: string | undefined,
  onInsert: (payload: SocialNotificationRow) => void
) {
  const onInsertRef = useRef(onInsert);
  onInsertRef.current = onInsert;

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`social-notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'social_notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload: { new: SocialNotificationRow }) => {
          onInsertRef.current(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
