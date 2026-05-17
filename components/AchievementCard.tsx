import { View, Text, TouchableOpacity } from 'react-native';
import { Database } from '@/types/database';

type AchievementRow = Database['public']['Tables']['achievements']['Row'];

const TIER_LABELS: Record<string, string> = {
  new_make: 'New Make',
  bonded: 'Bonded',
  single_barrel: 'Single Barrel',
};

interface AchievementCardProps {
  achievement: AchievementRow;
  earnedAt: string | null;
  onPress: () => void;
}

export function AchievementCard({ achievement, earnedAt, onPress }: AchievementCardProps) {
  const isEarned = earnedAt !== null;
  const tierLabel = achievement.tier ? TIER_LABELS[achievement.tier] : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      testID="achievement-card"
      className={`flex-row items-center p-3 mb-2 rounded-xl bg-brand-700 ${!isEarned ? 'opacity-50' : ''}`}
    >
      {!isEarned && (
        <View testID="achievement-locked" className="mr-3">
          <Text className="text-surface-text text-base">🔒</Text>
        </View>
      )}
      <View className="flex-1">
        <Text className="text-surface-text font-semibold text-sm">{achievement.title}</Text>
        {isEarned && tierLabel && (
          <Text className="text-surface-text text-xs mt-0.5 opacity-70">{tierLabel}</Text>
        )}
      </View>
      {isEarned && (
        <Text className="text-surface-text text-xs">✓</Text>
      )}
    </TouchableOpacity>
  );
}
