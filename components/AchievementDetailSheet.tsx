import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Database } from '@/types/database';

type AchievementRow = Database['public']['Tables']['achievements']['Row'];

const TIER_LABELS: Record<string, string> = {
  new_make: 'New Make',
  bonded: 'Bonded',
  single_barrel: 'Single Barrel',
};

const CATEGORY_LABELS: Record<string, string> = {
  tasting: 'Tasting',
  collection: 'Collection',
  social: 'Social',
  dojo: 'Dojo',
  explorer: 'Explorer',
};

interface AchievementDetailSheetProps {
  achievement: AchievementRow;
  earnedAt: string | null;
  onClose: () => void;
}

export function AchievementDetailSheet({
  achievement,
  earnedAt,
  onClose,
}: AchievementDetailSheetProps) {
  const tierLabel = achievement.tier ? TIER_LABELS[achievement.tier] : null;
  const categoryLabel = CATEGORY_LABELS[achievement.category] ?? achievement.category;
  const isEarned = earnedAt !== null;

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      testID="achievement-detail-sheet"
    >
      <SafeAreaView className="flex-1 bg-brand-900">
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-brand-700">
          <Text className="text-brand-100 text-lg font-bold flex-1 mr-3" numberOfLines={1}>
            {achievement.title}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            testID="achievement-detail-close"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-brand-400 text-lg">✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-4">
          {tierLabel && (
            <View className="mb-4">
              <Text className="text-brand-400 text-xs uppercase tracking-widest mb-1">Tier</Text>
              <Text className="text-brand-100 font-semibold">{tierLabel}</Text>
            </View>
          )}

          <View className="mb-4">
            <Text className="text-brand-400 text-xs uppercase tracking-widest mb-1">Category</Text>
            <Text className="text-brand-100 font-semibold">{categoryLabel}</Text>
          </View>

          <View className="mb-4">
            <Text className="text-brand-400 text-xs uppercase tracking-widest mb-1">
              Description
            </Text>
            <Text className="text-brand-100 leading-5">{achievement.description}</Text>
          </View>

          <View className="mb-4">
            <Text className="text-brand-400 text-xs uppercase tracking-widest mb-1">
              XP Awarded
            </Text>
            <Text className="text-brand-100 font-semibold">+{achievement.xp_award} XP</Text>
          </View>

          {isEarned ? (
            <View className="mb-4">
              <Text className="text-brand-400 text-xs uppercase tracking-widest mb-1">Earned</Text>
              <Text className="text-brand-100 font-semibold">
                {new Date(earnedAt).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          ) : (
            <View className="mb-4">
              <Text className="text-brand-400 text-xs uppercase tracking-widest mb-1">Status</Text>
              <Text className="text-brand-400">Not yet earned</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
