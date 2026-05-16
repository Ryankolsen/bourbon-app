import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type AchievementRow = Database['public']['Tables']['achievements']['Row'];

export interface AchievementWithStatus {
  achievement: AchievementRow;
  earnedAt: string | null;
}

export function useAchievements(userId: string | undefined) {
  const query = useQuery<AchievementWithStatus[]>({
    queryKey: ['achievements', userId],
    queryFn: async () => {
      const { data: achievementRows, error: aErr } = await supabase
        .from('achievements')
        .select('*')
        .order('category')
        .order('xp_award');
      if (aErr) throw aErr;

      const { data: earnedRows, error: eErr } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', userId!);
      if (eErr) throw eErr;

      const earnedMap = new Map(
        (earnedRows ?? []).map((r) => [r.achievement_id, r.earned_at])
      );

      return (achievementRows ?? []).map((achievement) => ({
        achievement,
        earnedAt: earnedMap.get(achievement.id) ?? null,
      }));
    },
    enabled: !!userId,
  });

  return {
    ...query,
    achievements: query.data ?? [],
  };
}

export function useAchievementsRealtime(userId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-achievements:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['achievements', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}
