import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState, useMemo } from "react";
import { useRouter } from "expo-router";
import { useBourbons } from "@/hooks/use-bourbons";
import { useBourbonFilters } from "@/hooks/use-bourbon-filters";
import { useAddToCollection } from "@/hooks/use-collection";
import { useUserRatings, useAllBourbonRatingStats } from "@/hooks/use-ratings";
import { useAuth } from "@/hooks/use-auth";
import { useWishlist, useAddToWishlist, useRemoveFromWishlist } from "@/hooks/use-wishlist";
import { useToast } from "@/lib/toast-provider";
import { buildAddToWishlistPayload } from "@/lib/wishlist";
import { buildAddToCollectionPayload } from "@/lib/collection";
import { FilterSheet } from "@/components/FilterSheet";
import { ActiveFilterChips } from "@/components/ActiveFilterChips";
import { BourbonCard } from "@/components/BourbonCard";
import { BourbonFilterState } from "@/lib/bourbons";
import { useFriendTastedBourbonIds } from "@/hooks/use-friend-tasted-bourbon-ids";

export default function ExploreScreen() {
  const [search, setSearch] = useState("");
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  // Track which bourbon IDs have an in-flight add-to-collection request
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());

  const { user } = useAuth();
  const {
    filters,
    hasActiveFilters,
    setTypes,
    setProofMin,
    setProofMax,
    setAgeMin,
    setAgeMax,
    setNasOnly,
    setDistillery,
    setSortField,
    setSortAscending,
    clearFilters,
  } = useBourbonFilters();

  const { data: bourbonsRaw, isLoading } = useBourbons(search, filters);
  const { data: friendTastedIds = new Set<string>() } = useFriendTastedBourbonIds(user?.id);
  const { data: allRatingStats = [] } = useAllBourbonRatingStats();

  // Apply client-side sorts that can't be done server-side:
  // - "social": friend-tasted bourbons first
  // - "avg_rating": requires join with bourbon_rating_stats view
  const bourbons = useMemo(() => {
    if (!bourbonsRaw) return bourbonsRaw;
    if (filters.sortField === "social") {
      const tasted: typeof bourbonsRaw = [];
      const rest: typeof bourbonsRaw = [];
      for (const b of bourbonsRaw) {
        if (friendTastedIds.has(b.id)) tasted.push(b);
        else rest.push(b);
      }
      return [...tasted, ...rest];
    }
    if (filters.sortField === "avg_rating") {
      const ratingLookup = new Map(allRatingStats.map((s) => [s.bourbon_id, s.avg_rating]));
      return [...bourbonsRaw].sort((a, b) => {
        const aRating = ratingLookup.get(a.id) ?? null;
        const bRating = ratingLookup.get(b.id) ?? null;
        // Bourbons with no ratings sort to the end regardless of direction
        if (aRating === null && bRating === null) return 0;
        if (aRating === null) return 1;
        if (bRating === null) return -1;
        const diff = Number(aRating) - Number(bRating);
        return filters.sortAscending ? diff : -diff;
      });
    }
    return bourbonsRaw;
  }, [bourbonsRaw, filters.sortField, filters.sortAscending, friendTastedIds, allRatingStats]);
  const { showToast } = useToast();
  const addToCollection = useAddToCollection();
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();
  const { data: wishlistItems = [] } = useWishlist(user?.id);
  const { data: userRatings } = useUserRatings(user?.id);
  const router = useRouter();

  const communityRatingsMap = new Map(allRatingStats.map((s) => [s.bourbon_id, s.avg_rating]));
  // Map bourbon_id → wishlist row id for O(1) lookup per card
  const wishlistMap = new Map(wishlistItems.map((w) => [w.bourbon_id, w.id]));

  function handleApplyFilters(newFilters: BourbonFilterState) {
    setTypes(newFilters.types);
    setProofMin(newFilters.proofMin);
    setProofMax(newFilters.proofMax);
    setAgeMin(newFilters.ageMin);
    setAgeMax(newFilters.ageMax);
    setNasOnly(newFilters.nasOnly);
    setDistillery(newFilters.distillery);
    setSortField(newFilters.sortField);
    setSortAscending(newFilters.sortAscending);
  }

  return (
    <View className="flex-1 bg-bourbon-900">
      <View className="px-4 pt-4 pb-2 gap-2">
        {/* Search bar + filter icon row */}
        <View className="flex-row gap-2">
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search bourbons..."
            placeholderTextColor="#7a3c19"
            className="flex-1 bg-bourbon-800 text-bourbon-100 rounded-xl px-4 py-3 text-base"
          />
          <TouchableOpacity
            onPress={() => setFilterSheetVisible(true)}
            className={`rounded-xl px-3 items-center justify-center ${
              hasActiveFilters ? "bg-bourbon-600" : "bg-bourbon-800"
            }`}
          >
            {/* Funnel icon — unicode approximation */}
            <Text className="text-xl">⚙️</Text>
            {hasActiveFilters && (
              <View className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
            )}
          </TouchableOpacity>
        </View>

        {/* Active filter chips — only visible when filters are non-default */}
        <ActiveFilterChips
          filters={filters}
          onClearType={(type) => setTypes(filters.types.filter((t) => t !== type))}
          onClearProof={() => { setProofMin(null); setProofMax(null); }}
          onClearAge={() => { setAgeMin(null); setAgeMax(null); setNasOnly(false); }}
          onClearDistillery={() => setDistillery(null)}
          onClearSort={() => setSortField(null)}
        />

        <TouchableOpacity
          onPress={() => router.push("/bourbon/new")}
          className="bg-bourbon-600 rounded-xl py-2.5 items-center"
        >
          <Text className="text-white font-medium text-sm">+ Add a Bourbon</Text>
        </TouchableOpacity>
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
          ListHeaderComponent={
            bourbons && bourbons.length > 0 ? (
              <Text className="text-bourbon-500 text-xs pt-1">
                {bourbons.length} {bourbons.length === 1 ? "bourbon" : "bourbons"}
                {hasActiveFilters ? " (filtered)" : ""}
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const wishlisted = wishlistMap.has(item.id);
            const wishlistRowId = wishlistMap.get(item.id);
            const isAdding = addingIds.has(item.id);
            return (
              <BourbonCard
                name={item.name}
                distillery={item.distillery ?? null}
                type={item.type ?? null}
                proof={item.proof ?? null}
                age={item.age_statement ?? null}
                personalRating={userRatings?.get(item.id) ?? null}
                communityRating={communityRatingsMap.get(item.id) ?? null}
                onPress={() => router.push(`/bourbon/${item.id}`)}
              >
                <View className="flex-row items-center justify-between mt-3">
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
                  {/* Add to Collection button */}
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
                    className="flex-1 ml-3 bg-bourbon-600 rounded-xl py-2 items-center"
                  >
                    <Text className="text-white font-medium text-sm">
                      {isAdding ? "Adding..." : "+ Add to Collection"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </BourbonCard>
            );
          }}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-bourbon-500 text-sm">
                {search || hasActiveFilters
                  ? "No bourbons match your search or filters."
                  : "No bourbons in the database yet."}
              </Text>
              {hasActiveFilters && (
                <TouchableOpacity onPress={clearFilters} className="mt-2">
                  <Text className="text-bourbon-400 text-sm underline">Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      <FilterSheet
        visible={filterSheetVisible}
        filters={filters}
        onApply={handleApplyFilters}
        onClose={() => setFilterSheetVisible(false)}
        showSocialSort
      />
    </View>
  );
}
