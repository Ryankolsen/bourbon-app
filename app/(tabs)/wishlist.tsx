import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useWishlist, useRemoveFromWishlist } from "@/hooks/use-wishlist";
import { useUserRatings, useAllBourbonRatingStats } from "@/hooks/use-ratings";
import { BourbonCard } from "@/components/BourbonCard";
import { colors } from "@/lib/colors";

export default function WishlistScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: wishlist, isLoading, isError } = useWishlist(user?.id);
  const removeFromWishlist = useRemoveFromWishlist();
  const { data: userRatings } = useUserRatings(user?.id);
  const { data: allRatingStats } = useAllBourbonRatingStats();
  const communityRatingsMap = new Map(
    (allRatingStats ?? []).map((s) => [s.bourbon_id, s.avg_rating])
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-brand-900 items-center justify-center">
        <ActivityIndicator color={colors.spinnerDefault} size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-brand-900 items-center justify-center px-8">
        <Text className="text-red-400 text-center">Failed to load wishlist.</Text>
      </View>
    );
  }

  if (!wishlist || wishlist.length === 0) {
    return (
      <View className="flex-1 bg-brand-900 items-center justify-center px-8">
        <Text className="text-5xl mb-4">⭐</Text>
        <Text className="text-brand-100 text-xl font-bold mb-2">Wishlist is empty</Text>
        <Text className="text-brand-400 text-center text-sm">
          Browse Explore and add bourbons you want to try.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-900">
      <FlatList
        data={wishlist}
        keyExtractor={(item) => item.id}
        contentContainerClassName="p-4 gap-3"
        renderItem={({ item }) => {
          const bourbon = (item as any).bourbons;
          return (
            <BourbonCard
              name={bourbon?.name ?? "Unknown"}
              distillery={bourbon?.distillery ?? null}
              type={bourbon?.type ?? null}
              proof={bourbon?.proof ?? null}
              age={bourbon?.age_statement ?? null}
              personalRating={userRatings?.get(item.bourbon_id) ?? null}
              communityRating={communityRatingsMap.get(item.bourbon_id) ?? null}
              onPress={() => router.push(`/bourbon/${item.bourbon_id}`)}
            >
              <TouchableOpacity
                onPress={() => {
                  if (!user) return;
                  removeFromWishlist.mutate({
                    id: item.id,
                    userId: user.id,
                    bourbonId: item.bourbon_id,
                  });
                }}
                className="mt-3 px-3 py-1.5 rounded-xl bg-brand-700 items-center"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-brand-300 text-xs">Remove from Wishlist</Text>
              </TouchableOpacity>
            </BourbonCard>
          );
        }}
      />
    </View>
  );
}
