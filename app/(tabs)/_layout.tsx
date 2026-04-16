import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin } from "@/lib/admin";
import { useGroupNotifications } from "@/hooks/use-group-notifications";
import { colors } from "@/lib/colors";

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
            backgroundColor: colors.badgeError,
          }}
        />
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { user } = useAuth();
  const adminUser = !!(user?.email && isAdmin(user.email));

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBorder,
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        headerStyle: { backgroundColor: colors.tabBar },
        headerTintColor: colors.headerTint,
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
