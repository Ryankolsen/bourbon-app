import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { AchievementWithStatus } from './use-achievements';

type AchievementRow = Database['public']['Tables']['achievements']['Row'];

export function useEarnedAchievements(userId: string | undefined) {
  const query = useQuery<AchievementWithStatus[]>({
    queryKey: ['earned-achievements', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('earned_at, achievements(*)')
        .eq('user_id', userId!);
      if (error) throw error;

      return (data ?? []).map((row) => ({
        achievement: row.achievements as AchievementRow,
        earnedAt: row.earned_at,
      }));
    },
    enabled: !!userId,
  });

  return {
    ...query,
    achievements: query.data ?? [],
  };
}
