import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { useCollection } from "@/hooks/use-collection";

export default function CollectionScreen() {
  const { user } = useAuth();
  const { data: collection, isLoading, isError } = useCollection(user?.id);

  if (isLoading) {
    return (
      <View className="flex-1 bg-bourbon-900 items-center justify-center">
        <ActivityIndicator color="#e39e38" size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-bourbon-900 items-center justify-center px-8">
        <Text className="text-red-400 text-center">Failed to load collection.</Text>
      </View>
    );
  }

  if (!collection || collection.length === 0) {
    return (
      <View className="flex-1 bg-bourbon-900 items-center justify-center px-8">
        <Text className="text-5xl mb-4">🥃</Text>
        <Text className="text-bourbon-100 text-xl font-bold mb-2">
          Your vault is empty
        </Text>
        <Text className="text-bourbon-400 text-center text-sm">
          Head to Explore to add bourbons to your collection.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bourbon-900">
      <FlatList
        data={collection}
        keyExtractor={(item) => item.id}
        contentContainerClassName="p-4 gap-3"
        renderItem={({ item }) => {
          const bourbon = (item as any).bourbons;
          return (
            <View className="bg-bourbon-800 rounded-2xl p-4">
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-bourbon-100 font-bold text-lg">
                    {bourbon?.name ?? "Unknown"}
                  </Text>
                  <Text className="text-bourbon-400 text-sm mt-0.5">
                    {bourbon?.distillery ?? "Unknown distillery"}
                  </Text>
                </View>
                <View
                  className={`px-3 py-1 rounded-full ${
                    item.bottle_status === "sealed"
                      ? "bg-green-900"
                      : item.bottle_status === "open"
                      ? "bg-bourbon-600"
                      : "bg-gray-800"
                  }`}
                >
                  <Text className="text-xs font-medium text-bourbon-100 capitalize">
                    {item.bottle_status}
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-4 mt-3">
                {bourbon?.proof && (
                  <Text className="text-bourbon-400 text-xs">
                    {bourbon.proof} proof
                  </Text>
                )}
                {bourbon?.age_statement && (
                  <Text className="text-bourbon-400 text-xs">
                    {bourbon.age_statement} yr
                  </Text>
                )}
                {item.purchase_price && (
                  <Text className="text-bourbon-400 text-xs">
                    ${item.purchase_price}
                  </Text>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
