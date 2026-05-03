import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useBourbonSuggestions } from "@/hooks/use-bourbon-suggestions";
import { colors } from "@/lib/colors";

export default function AdminScreen() {
  const router = useRouter();
  const { data: suggestions = [] } = useBourbonSuggestions();
  const pendingCount = suggestions.length;

  return (
    <View className="flex-1 items-center justify-center bg-gray-950 gap-4">
      <Text className="text-2xl font-bold text-white mb-2">Admin</Text>

      <TouchableOpacity
        onPress={() => router.push("/admin/suggestions" as never)}
        className="bg-brand-800 border border-brand-600 px-6 py-4 rounded-xl w-64 flex-row items-center justify-between"
        testID="suggestions-nav-button"
      >
        <View>
          <Text className="text-white font-semibold text-base">Review Suggestions</Text>
          <Text className="text-brand-400 text-xs mt-0.5">Pending Tier 2 edits</Text>
        </View>
        {pendingCount > 0 && (
          <View
            style={{
              backgroundColor: colors.badgeError,
              borderRadius: 10,
              minWidth: 22,
              height: 22,
              paddingHorizontal: 6,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>
              {pendingCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/dev/themes")}
        className="bg-brand-600 px-6 py-3 rounded-xl"
      >
        <Text className="text-white font-semibold text-base">🎨 Theme Picker</Text>
      </TouchableOpacity>
    </View>
  );
}
