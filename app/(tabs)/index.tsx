import { useState } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import CollectionTab from "@/components/CollectionTab";
import WishlistTab from "@/components/WishlistTab";
import { FeedCard } from "@/components/FeedCard";
import {
  HOME_SEGMENTS,
  DEFAULT_SEGMENT_INDEX,
  SEGMENT_CONTENT_KEYS,
} from "@/lib/home-segments";
import { useTheme } from "@/lib/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { useFollowingFeed } from "@/hooks/use-following-feed";

function FeedEmptyState() {
  return (
    <View className="flex-1 bg-brand-900 items-center justify-center px-8">
      <Text className="text-5xl mb-4">📰</Text>
      <Text className="text-brand-100 text-xl font-bold mb-2">Nothing here yet</Text>
      <Text className="text-brand-400 text-center text-sm">
        Follow some users to see their tastings here.
      </Text>
    </View>
  );
}

function FeedSegment() {
  const { user } = useAuth();
  const { data: feedItems, isLoading } = useFollowingFeed(user?.id);

  if (isLoading) {
    return (
      <View className="flex-1 bg-brand-900 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (!feedItems || feedItems.length === 0) {
    return <FeedEmptyState />;
  }

  return (
    <FlatList
      className="flex-1 bg-brand-900"
      data={feedItems}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <FeedCard item={item} />}
      contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
    />
  );
}

export default function HomeScreen() {
  const [activeIndex, setActiveIndex] = useState(DEFAULT_SEGMENT_INDEX);
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;
  const activeKey = SEGMENT_CONTENT_KEYS[activeIndex];

  return (
    <View className="flex-1 bg-brand-900">
      {/* Segmented control */}
      <View
        className="flex-row mx-4 mt-3 mb-1 rounded-xl overflow-hidden"
        style={{ backgroundColor: c.brand800 }}
      >
        {HOME_SEGMENTS.map((label, index) => {
          const isActive = index === activeIndex;
          return (
            <TouchableOpacity
              key={label}
              onPress={() => setActiveIndex(index)}
              className="flex-1 py-2 items-center"
              style={{
                backgroundColor: isActive ? c.tabActive : "transparent",
                borderRadius: 10,
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                className="text-sm font-medium"
                style={{
                  color: isActive ? c.white : c.tabInactive,
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Segment content */}
      {activeKey === "feed" && <FeedSegment />}
      {activeKey === "collection" && <CollectionTab />}
      {activeKey === "wishlist" && <WishlistTab />}
    </View>
  );
}
