import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAchievements, useAchievementsRealtime } from '@/hooks/use-achievements';
import { useEarnedAchievements } from '@/hooks/use-earned-achievements';
import { AchievementCard } from './AchievementCard';
import { AchievementDetailSheet } from './AchievementDetailSheet';
import { Database } from '@/types/database';

type AchievementRow = Database['public']['Tables']['achievements']['Row'];

const CATEGORIES = ['Tasting', 'Collection', 'Social', 'Dojo', 'Explorer'] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_MAP: Record<Category, string> = {
  Tasting: 'tasting',
  Collection: 'collection',
  Social: 'social',
  Dojo: 'dojo',
  Explorer: 'explorer',
};

interface AchievementSectionProps {
  userId: string | undefined;
  isOwnProfile: boolean;
}

export function AchievementSection({ userId, isOwnProfile }: AchievementSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>('Tasting');
  const [selected, setSelected] = useState<{
    achievement: AchievementRow;
    earnedAt: string | null;
  } | null>(null);

  const ownData = useAchievements(isOwnProfile ? userId : undefined);
  const visitorData = useEarnedAchievements(!isOwnProfile ? userId : undefined);
  useAchievementsRealtime(isOwnProfile ? userId : undefined);

  const achievements = isOwnProfile ? ownData.achievements : visitorData.achievements;

  const filteredAchievements = achievements.filter(({ achievement }) => {
    return achievement.category === CATEGORY_MAP[activeCategory];
  });

  return (
    <View className="bg-brand-800 rounded-2xl p-4 mb-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-brand-400 text-xs uppercase tracking-widest">Achievements</Text>
        <TouchableOpacity
          testID="achievement-expand-button"
          onPress={() => setExpanded((e) => !e)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-brand-400 text-sm">{expanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      </View>

      {expanded && (
        <>
          {/* Category tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3 mb-2"
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                testID={`achievement-tab-${cat.toLowerCase()}`}
                onPress={() => setActiveCategory(cat)}
                className={`mr-2 px-3 py-1.5 rounded-full border ${
                  activeCategory === cat ? 'bg-brand-500 border-brand-500' : 'border-brand-600'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    activeCategory === cat ? 'text-white' : 'text-brand-400'
                  }`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Achievement cards */}
          <View className="mt-1">
            {filteredAchievements.map(({ achievement, earnedAt }) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                earnedAt={earnedAt}
                onPress={() => setSelected({ achievement, earnedAt })}
              />
            ))}
            {filteredAchievements.length === 0 && (
              <Text className="text-brand-400 text-sm text-center py-4">
                No achievements yet in this category.
              </Text>
            )}
          </View>
        </>
      )}

      {selected && (
        <AchievementDetailSheet
          achievement={selected.achievement}
          earnedAt={selected.earnedAt}
          onClose={() => setSelected(null)}
        />
      )}
    </View>
  );
}
