import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function AdminScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-gray-950 gap-4">
      <Text className="text-2xl font-bold text-white mb-2">Admin</Text>
      <TouchableOpacity
        onPress={() => router.push("/dev/themes")}
        className="bg-brand-600 px-6 py-3 rounded-xl"
      >
        <Text className="text-white font-semibold text-base">🎨 Theme Picker</Text>
      </TouchableOpacity>
    </View>
  );
}
