import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin } from "@/lib/admin";
import { useGroupNotifications } from "@/hooks/use-group-notifications";
import { useSocialNotifications } from "@/hooks/use-social-notifications";
import { useTheme } from "@/lib/theme-provider";
import { useCheckIn } from "@/hooks/use-check-in";
import { useXpNotification } from "@/context/xp-context";
import { getXpEventLabel } from "@/lib/belt-config";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text className={focused ? "text-2xl" : "text-2xl opacity-50"}>
      {emoji}
    </Text>
  );
}

function GroupsTabIcon({ focused }: { focused: boolean }) {
  const { user } = useAuth();
  const { data: notifications } = useGroupNotifications(user?.id);
  const { activeTheme } = useTheme();
  const unreadCount = notifications?.length ?? 0;

  return (
    <View>
      <Text className={focused ? "text-2xl" : "text-2xl opacity-50"}>🥃</Text>
      {unreadCount > 0 && (
        <View
          style={{
            position: "absolute",
            top: -2,
            right: -4,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: activeTheme.colors.badgeError,
          }}
        />
      )}
    </View>
  );
}

function BellIcon() {
  const { user } = useAuth();
  const { data: notifications } = useSocialNotifications(user?.id);
  const { activeTheme } = useTheme();
  const router = useRouter();
  const unreadCount = notifications?.length ?? 0;

  return (
    <TouchableOpacity
      onPress={() => router.push('/notifications' as never)}
      accessibilityLabel="Notifications"
      style={{ marginRight: 12 }}
    >
      <View>
        <Text style={{ fontSize: 22 }}>🔔</Text>
        {unreadCount > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -4,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: activeTheme.colors.badgeError,
            }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const { user } = useAuth();
  const { activeTheme } = useTheme();
  const adminUser = !!(user?.email && isAdmin(user.email));

  const { enqueue } = useXpNotification();

  // Fire the daily check-in RPC once per confirmed userId per session.
  // Gated on userId so it never fires with a null auth state.
  // The RPC is idempotent — same-day calls are no-ops.
  const checkIn = useCheckIn(user?.id);

  // When the RPC returns non-zero XP, push the notification directly into
  // XpContext without waiting for the Realtime channel to establish. This
  // avoids the race where the Realtime subscription hasn't fully connected
  // before check_in() inserts into xp_events, causing the toast to be missed.
  // A stable date-based id deduplicates against a subsequent Realtime event.
  useEffect(() => {
    if (checkIn.isLoading || checkIn.lastXpAwarded === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    enqueue({
      id: `daily_checkin-${today}`,
      xpAwarded: checkIn.lastXpAwarded,
      eventType: "daily_checkin",
      label: getXpEventLabel("daily_checkin"),
      promoted: checkIn.promoted,
      newBelt: checkIn.newBelt,
      streakDays: checkIn.streakDays,
      isReset: checkIn.isReset,
      tomorrowXp: checkIn.tomorrowXp,
    });
  }, [checkIn.lastXpAwarded, checkIn.isLoading, enqueue]);

  const c = activeTheme.colors;

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.tabBorder,
        },
        tabBarActiveTintColor: c.tabActive,
        tabBarInactiveTintColor: c.tabInactive,
        headerStyle: { backgroundColor: c.tabBar },
        headerTintColor: c.headerTint,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
          headerRight: () => <BellIcon />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="tastings"
        options={{
          title: "Tastings",
          tabBarIcon: ({ focused }) => <TabIcon emoji="📓" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
          tabBarIcon: ({ focused }) => <GroupsTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: adminUser ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔧" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
