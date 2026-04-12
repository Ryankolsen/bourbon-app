import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useBourbons } from "@/hooks/use-bourbons";
import { useAddToCollection } from "@/hooks/use-collection";
import { useAllBourbonRatingStats } from "@/hooks/use-ratings";
import { useAuth } from "@/hooks/use-auth";
import { useWishlist, useAddToWishlist, useRemoveFromWishlist } from "@/hooks/use-wishlist";
import { useToast } from "@/lib/toast";
import { buildAddToWishlistPayload } from "@/lib/wishlist";
import { buildAddToCollectionPayload } from "@/lib/collection";

export default function ExploreScreen() {
  const [search, setSearch] = useState("");
  // Track which bourbon IDs have an in-flight add-to-collection request
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { data: bourbons, isLoading } = useBourbons(search);
  const { data: allRatingStats = [] } = useAllBourbonRatingStats();
  const { showToast } = useToast();
  const addToCollection = useAddToCollection();
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();
  const { data: wishlistItems = [] } = useWishlist(user?.id);
  const router = useRouter();

  const ratingMap = new Map(allRatingStats.map((s) => [s.bourbon_id, s]));
  // Map bourbon_id → wishlist row id for O(1) lookup per card
  const wishlistMap = new Map(wishlistItems.map((w) => [w.bourbon_id, w.id]));

  return (
    <View className="flex-1 bg-bourbon-900">
      <View className="px-4 pt-4 pb-2">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search bourbons..."
          placeholderTextColor="#7a3c19"
          className="bg-bourbon-800 text-bourbon-100 rounded-xl px-4 py-3 text-base"
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#e39e38" />
        </View>
      ) : (
        <FlatList
          data={bourbons}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pb-4 gap-3"
          renderItem={({ item }) => {
            const stats = ratingMap.get(item.id);
            const hasRating = stats && stats.rating_count > 0;
            const wishlisted = wishlistMap.has(item.id);
            const wishlistRowId = wishlistMap.get(item.id);
            const isAdding = addingIds.has(item.id);
            return (
            <TouchableOpacity
              className="bg-bourbon-800 rounded-2xl p-4"
              onPress={() => router.push(`/bourbon/${item.id}`)}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-bourbon-100 font-bold text-base">{item.name}</Text>
                  <Text className="text-bourbon-400 text-sm mt-0.5">
                    {item.distillery ?? "Unknown distillery"}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  {/* Wishlist heart toggle */}
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={(e) => {
                      e.stopPropagation();
                      if (!user) return;
                      if (wishlisted && wishlistRowId) {
                        removeFromWishlist.mutate({
                          id: wishlistRowId,
                          userId: user.id,
                          bourbonId: item.id,
                        });
                      } else {
                        addToWishlist.mutate(buildAddToWishlistPayload(user.id, item.id));
                      }
                    }}
                  >
                    <Text className="text-xl">{wishlisted ? "★" : "☆"}</Text>
                  </TouchableOpacity>
                  {hasRating && (
                    <View className="bg-bourbon-700 rounded-xl px-2 py-1 items-center min-w-[48px]">
                      <Text className="text-bourbon-100 text-sm font-bold">
                        {stats!.avg_rating}
                      </Text>
                      <Text className="text-bourbon-500 text-[10px]">
                        {stats!.rating_count} {stats!.rating_count === 1 ? "rating" : "ratings"}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View className="flex-row gap-4 mt-2">
                {item.proof && (
                  <Text className="text-bourbon-400 text-xs">{item.proof} proof</Text>
                )}
                {item.age_statement && (
                  <Text className="text-bourbon-400 text-xs">{item.age_statement} yr</Text>
                )}
                {item.msrp && (
                  <Text className="text-bourbon-400 text-xs">${item.msrp} MSRP</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!user || isAdding) return;
                  setAddingIds((prev) => new Set(prev).add(item.id));
                  addToCollection.mutate(
                    buildAddToCollectionPayload(user.id, item.id),
                    {
                      onSuccess: () => {
                        showToast(`${item.name} added to your collection`);
                      },
                      onError: (err) => {
                        const pgErr = err as { code?: string };
                        if (pgErr.code === "23505") {
                          showToast("Already in your collection", "error");
                        } else {
                          showToast("Failed to add to collection", "error");
                        }
                      },
                      onSettled: () => {
                        setAddingIds((prev) => {
                          const next = new Set(prev);
                          next.delete(item.id);
                          return next;
                        });
                      },
                    }
                  );
                }}
                disabled={isAdding}
                className="mt-3 bg-bourbon-600 rounded-xl py-2 items-center"
              >
                <Text className="text-white font-medium text-sm">
                  {isAdding ? "Adding..." : "+ Add to Collection"}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
          }}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-bourbon-500 text-sm">
                {search ? "No bourbons found." : "No bourbons in the database yet."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
