import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useWishlist, useRemoveFromWishlist } from "@/hooks/use-wishlist";

export default function WishlistScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: wishlist, isLoading, isError } = useWishlist(user?.id);
  const removeFromWishlist = useRemoveFromWishlist();

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
        <Text className="text-red-400 text-center">Failed to load wishlist.</Text>
      </View>
    );
  }

  if (!wishlist || wishlist.length === 0) {
    return (
      <View className="flex-1 bg-bourbon-900 items-center justify-center px-8">
        <Text className="text-5xl mb-4">⭐</Text>
        <Text className="text-bourbon-100 text-xl font-bold mb-2">Wishlist is empty</Text>
        <Text className="text-bourbon-400 text-center text-sm">
          Browse Explore and add bourbons you want to try.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bourbon-900">
      <FlatList
        data={wishlist}
        keyExtractor={(item) => item.id}
        contentContainerClassName="p-4 gap-3"
        renderItem={({ item }) => {
          const bourbon = (item as any).bourbons;
          return (
            <TouchableOpacity
              className="bg-bourbon-800 rounded-2xl p-4"
              onPress={() => router.push(`/bourbon/${item.bourbon_id}`)}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-3">
                  <Text className="text-bourbon-100 font-bold text-lg">
                    {bourbon?.name ?? "Unknown"}
                  </Text>
                  <Text className="text-bourbon-400 text-sm mt-0.5">
                    {bourbon?.distillery ?? "Unknown distillery"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (!user) return;
                    removeFromWishlist.mutate({
                      id: item.id,
                      userId: user.id,
                      bourbonId: item.bourbon_id,
                    });
                  }}
                  className="px-3 py-1 rounded-full bg-bourbon-700"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text className="text-bourbon-300 text-xs">Remove</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row gap-4 mt-3">
                {bourbon?.proof && (
                  <Text className="text-bourbon-400 text-xs">{bourbon.proof} proof</Text>
                )}
                {bourbon?.age_statement && (
                  <Text className="text-bourbon-400 text-xs">{bourbon.age_statement} yr</Text>
                )}
                {bourbon?.msrp && (
                  <Text className="text-bourbon-400 text-xs">${bourbon.msrp}</Text>
                )}
                {bourbon?.type && (
                  <Text className="text-bourbon-400 text-xs capitalize">{bourbon.type}</Text>
                )}
              </View>

              {item.notes && (
                <Text className="text-bourbon-500 text-xs mt-2 italic">{item.notes}</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
