import { Tabs, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { AccessiblePressable } from "@/components/AccessiblePressable";
import { groupsTabLabel } from "@/lib/groups-tab-label";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin } from "@/lib/admin";
import { useGroupNotifications } from "@/hooks/use-group-notifications";
import { useSocialNotifications } from "@/hooks/use-social-notifications";
import { useBourbonSuggestions } from "@/hooks/use-bourbon-suggestions";
import { useTheme } from "@/lib/theme-provider";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text accessible={false} importantForAccessibility="no" className={focused ? "text-2xl" : "text-2xl opacity-50"}>
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
      <Text accessible={false} importantForAccessibility="no" className={focused ? "text-2xl" : "text-2xl opacity-50"}>🥃</Text>
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
    <AccessiblePressable
      onPress={() => router.push('/notifications' as never)}
      accessibilityLabel="Notifications"
      style={{ marginRight: 12 }}
    >
      <View>
        <Text accessible={false} importantForAccessibility="no" style={{ fontSize: 22 }}>🔔</Text>
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
    </AccessiblePressable>
  );
}

function AdminTabIcon({ focused }: { focused: boolean }) {
  const { data: suggestions = [] } = useBourbonSuggestions();
  const { activeTheme } = useTheme();
  const pendingCount = suggestions.length;

  return (
    <View>
      <Text accessible={false} importantForAccessibility="no" className={focused ? "text-2xl" : "text-2xl opacity-50"}>🔧</Text>
      {pendingCount > 0 && (
        <View
          style={{
            position: "absolute",
            top: -2,
            right: -4,
            minWidth: 14,
            height: 14,
            borderRadius: 7,
            paddingHorizontal: 2,
            backgroundColor: activeTheme.colors.badgeError,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 9, fontWeight: "bold" }}>
            {pendingCount}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { user } = useAuth();
  const { activeTheme } = useTheme();
  const adminUser = !!(user?.email && isAdmin(user.email));
  const { data: groupNotifications } = useGroupNotifications(user?.id);
  const groupsLabel = groupsTabLabel(groupNotifications?.length ?? 0);

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
          tabBarAccessibilityLabel: groupsLabel,
          tabBarIcon: ({ focused }) => <GroupsTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="dojo"
        options={{
          title: "Dojo",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🥋" focused={focused} />,
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
          tabBarIcon: ({ focused }) => <AdminTabIcon focused={focused} />,
        }}
      />
    </Tabs>
  );
}
