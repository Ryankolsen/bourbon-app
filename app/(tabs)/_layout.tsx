import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin } from "@/lib/admin";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text className={focused ? "text-2xl" : "text-2xl opacity-50"}>
      {emoji}
    </Text>
  );
}

export default function TabsLayout() {
  const { user } = useAuth();
  const adminUser = !!(user?.email && isAdmin(user.email));

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#0d0a2e",
          borderTopColor: "#2a1f6e",
        },
        tabBarActiveTintColor: "#818cf8",
        tabBarInactiveTintColor: "#4a4580",
        headerStyle: { backgroundColor: "#0d0a2e" },
        headerTintColor: "#e0e7ff",
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
          tabBarIcon: ({ focused }) => <TabIcon emoji="🥃" focused={focused} />,
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
