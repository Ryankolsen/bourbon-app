import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/use-auth';
import {
  useSocialNotifications,
  useDismissSocialNotification,
  useSocialNotificationsRealtime,
  SocialNotification,
} from '@/hooks/use-social-notifications';
import { Database } from '@/types/database';
import { useTheme } from '@/lib/theme-provider';

type SocialNotificationRow = Database['public']['Tables']['social_notifications']['Row'];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function NotificationRow({
  item,
  onDismiss,
}: {
  item: SocialNotification;
  onDismiss: (id: string) => void;
}) {
  const router = useRouter();
  const actorName = item.profiles?.username
    ? `@${item.profiles.username}`
    : item.profiles?.display_name ?? 'Someone';

  const label =
    item.type === 'new_tasting'
      ? `${actorName} logged a tasting`
      : `${actorName} is now following you`;

  function handlePress() {
    if (item.type === 'new_tasting' && item.tasting_id) {
      // Navigate to bourbon via tasting — for now navigate to actor profile
      // Full bourbon lookup would need a separate query; navigate to actor
      router.push(`/user/${item.actor_id}` as never);
    } else {
      router.push(`/user/${item.actor_id}` as never);
    }
  }

  return (
    <TouchableOpacity
      className="flex-row items-center bg-brand-800 rounded-2xl p-4 mx-4 mb-3"
      onPress={handlePress}
      testID="notification-row"
    >
      <View className="flex-1">
        <Text className="text-brand-100 text-sm font-medium" numberOfLines={2}>
          {label}
        </Text>
        <Text className="text-brand-400 text-xs mt-1">{formatDate(item.created_at)}</Text>
      </View>
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          onDismiss(item.id);
        }}
        accessibilityLabel="Dismiss notification"
        testID="dismiss-notification"
        className="ml-3 p-1"
      >
        <Text className="text-brand-400 text-base">✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: notifications = [], isLoading } = useSocialNotifications(user?.id);
  const dismiss = useDismissSocialNotification(user?.id);

  // Realtime: prepend new notifications without a full re-fetch
  const [realtimeItems, setRealtimeItems] = useState<SocialNotification[]>([]);

  const handleRealtimeInsert = useCallback((row: SocialNotificationRow) => {
    setRealtimeItems((prev) => {
      if (prev.find((n) => n.id === row.id)) return prev;
      return [{ ...row, profiles: null } as SocialNotification, ...prev];
    });
  }, []);

  useSocialNotificationsRealtime(user?.id, handleRealtimeInsert);

  // Merge realtime items at the top, deduplicate
  const allItems: SocialNotification[] = [
    ...realtimeItems.filter((r) => !notifications.find((n) => n.id === r.id)),
    ...notifications,
  ];

  function handleDismiss(id: string) {
    dismiss.mutate({ notificationId: id });
    setRealtimeItems((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <View className="flex-1 bg-brand-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-3 border-b"
        style={{ borderBottomColor: c.tabBorder }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-3"
          accessibilityLabel="Go back"
        >
          <Text className="text-brand-400 text-base">‹ Back</Text>
        </TouchableOpacity>
        <Text className="text-brand-100 text-lg font-bold flex-1">Notifications</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : allItems.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">🔔</Text>
          <Text className="text-brand-100 text-xl font-bold mb-2">All caught up!</Text>
          <Text className="text-brand-400 text-center text-sm">
            No new notifications right now.
          </Text>
        </View>
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationRow item={item} onDismiss={handleDismiss} />
          )}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
        />
      )}
    </View>
  );
}
