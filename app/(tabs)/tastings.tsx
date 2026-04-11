import { View, Text } from "react-native";

export default function TastingsScreen() {
  return (
    <View className="flex-1 bg-bourbon-900 items-center justify-center px-8">
      <Text className="text-5xl mb-4">📓</Text>
      <Text className="text-bourbon-100 text-xl font-bold mb-2">Tasting Notes</Text>
      <Text className="text-bourbon-400 text-center text-sm">
        Log your tasting notes, nose, palate, finish, and overall rating.
      </Text>
      <Text className="text-bourbon-600 text-xs mt-4">Coming soon</Text>
    </View>
  );
}
