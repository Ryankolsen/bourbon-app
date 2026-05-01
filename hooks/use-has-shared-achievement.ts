/**
 * useHasSharedAchievement — checks whether the current user has already earned
 * an `achievement_shared` XP event for the given referenceKey.
 *
 * Used to gate the first-tasting share prompt: if the user has already shared
 * (referenceKey = 'first_tasting'), the prompt is skipped.
 *
 * Usage:
 *   const { data: hasShared, isLoading } =
 *     useHasSharedAchievement('first_tasting', user?.id);
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useHasSharedAchievement(
  referenceKey: string,
  userId: string | undefined,
) {
  return useQuery({
    queryKey: ['has_shared_achievement', userId, referenceKey],
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase
        .from('xp_events')
        .select('id')
        .eq('user_id', userId)
        .eq('event_type', 'achievement_shared')
        .eq('reference_key', referenceKey)
        .limit(1);
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
    enabled: !!userId,
  });
}
