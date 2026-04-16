import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin } from "@/lib/admin";
import { useGroupNotifications } from "@/hooks/use-group-notifications";
import { useTheme } from "@/lib/theme-provider";

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

export default function TabsLayout() {
  const { user } = useAuth();
  const { activeTheme } = useTheme();
  const adminUser = !!(user?.email && isAdmin(user.email));
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
          title: "Collection",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🍶" focused={focused} />,
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
        name="wishlist"
        options={{
          title: "Wishlist",
          tabBarIcon: ({ focused }) => <TabIcon emoji="⭐" focused={focused} />,
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
