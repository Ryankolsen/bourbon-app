import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "@/hooks/use-auth";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <View className="flex-1 bg-bourbon-900 px-6 pt-8">
      <View className="bg-bourbon-800 rounded-2xl p-6 mb-4">
        <Text className="text-bourbon-400 text-xs uppercase tracking-widest mb-1">
          Signed in as
        </Text>
        <Text className="text-bourbon-100 font-semibold text-base">
          {user?.email ?? "—"}
        </Text>
      </View>

      <TouchableOpacity
        onPress={signOut}
        className="bg-red-900/60 border border-red-800 rounded-2xl py-4 items-center"
      >
        <Text className="text-red-300 font-semibold">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
