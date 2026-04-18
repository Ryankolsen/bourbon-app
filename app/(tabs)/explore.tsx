import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
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
import { useFriendTastedBourbonIds } from "@/hooks/use-friend-tasted-bourbon-ids";
import { useTrendingFollowedBourbons } from "@/hooks/use-trending-followed-bourbons";
import { colors } from "@/lib/colors";

export default function ExploreScreen() {
  const [search, setSearch] = useState("");
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [trendingToggle, setTrendingToggle] = useState<"taste_count" | "rating">("taste_count");
  // Track which bourbon IDs have an in-flight add-to-collection request
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());

  const { user } = useAuth();
  const {
    filters,
    hasActiveFilters,
    applyFilters,
    patchFilters,
    resetFilters,
  } = useBourbonFilters();

  const { data: bourbonsRaw, isLoading } = useBourbons(search, filters);
  const { data: friendTastedIds = new Set<string>() } = useFriendTastedBourbonIds(user?.id);
  const { data: allRatingStats = [] } = useAllBourbonRatingStats();
  const { data: trending } = useTrendingFollowedBourbons(user?.id);

  // Apply client-side sorts that can't be done server-side:
  // - "social": friend-tasted bourbons first
  // - "avg_rating": requires join with bourbon_rating_stats view
  // - "friendsOnly": filter to only bourbons tasted by followed users
  const bourbons = useMemo(() => {
    if (!bourbonsRaw) return bourbonsRaw;
    let result = bourbonsRaw;

    if (filters.friendsOnly) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = result.filter((b: any) => friendTastedIds.has(b.id));
    }

    if (filters.sortField === "social") {
      const tasted: typeof result = [];
      const rest: typeof result = [];
      for (const b of result) {
        if (friendTastedIds.has(b.id)) tasted.push(b);
        else rest.push(b);
      }
      return [...tasted, ...rest];
    }
    if (filters.sortField === "avg_rating") {
      const ratingLookup = new Map(allRatingStats.map((s) => [s.bourbon_id, s.avg_rating]));
      return [...result].sort((a, b) => {
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
    return result;
  }, [bourbonsRaw, filters.friendsOnly, filters.sortField, filters.sortAscending, friendTastedIds, allRatingStats]);

  // Build a lookup map from the fetched bourbons for the trending section
  const bourbonLookup = useMemo(() => {
    if (!bourbonsRaw) return new Map<string, Record<string, unknown>>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Map<string, any>(bourbonsRaw.map((b: any) => [b.id, b]));
  }, [bourbonsRaw]);

  const trendingIds =
    trendingToggle === "taste_count"
      ? (trending?.byTasteCount ?? [])
      : (trending?.byRating ?? []);
  const hasTrending = trendingIds.length > 0;
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


  return (
    <View className="flex-1 bg-brand-900">
      <View className="px-4 pt-4 pb-2 gap-2">
        {/* Search bar + filter icon row */}
        <View className="flex-row gap-2">
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search bourbons..."
            placeholderTextColor={colors.placeholderDark}
            className="flex-1 bg-brand-800 text-brand-100 rounded-xl px-4 py-3 text-base"
          />
          <TouchableOpacity
            onPress={() => setFilterSheetVisible(true)}
            className={`rounded-xl px-3 items-center justify-center ${
              hasActiveFilters ? "bg-brand-600" : "bg-brand-800"
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
          onClearType={(type) => patchFilters({ types: filters.types.filter((t) => t !== type) })}
          onClearProof={() => patchFilters({ proofMin: null, proofMax: null })}
          onClearAge={() => patchFilters({ ageMin: null, ageMax: null, nasOnly: false })}
          onClearDistillery={() => patchFilters({ distillery: null })}
          onClearSort={() => patchFilters({ sortField: null })}
        />

        <TouchableOpacity
          onPress={() => router.push("/bourbon/new")}
          className="bg-brand-600 rounded-xl py-2.5 items-center"
        >
          <Text className="text-white font-medium text-sm">+ Add a Bourbon</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.spinnerDefault} />
        </View>
      ) : (
        <FlatList
          data={bourbons}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pb-4 gap-3"
          ListHeaderComponent={
            <>
              {/* ── Trending section ── */}
              {hasTrending && (
                <View className="mb-4">
                  <Text className="text-brand-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Trending among people you follow
                  </Text>
                  {/* Toggle */}
                  <View className="flex-row gap-2 mb-3">
                    {(["taste_count", "rating"] as const).map((key) => {
                      const label = key === "taste_count" ? "Most Tasted" : "Highest Rated";
                      const active = trendingToggle === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          onPress={() => setTrendingToggle(key)}
                          className={`px-3 py-1.5 rounded-full border ${
                            active
                              ? "bg-brand-600 border-brand-600"
                              : "bg-brand-800 border-brand-700"
                          }`}
                        >
                          <Text
                            className={`text-xs font-medium ${
                              active ? "text-white" : "text-brand-300"
                            }`}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {/* Horizontal scroll of trending bourbons */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    {trendingIds.map((bourbonId) => {
                      const b = bourbonLookup.get(bourbonId);
                      if (!b) return null;
                      return (
                        <TouchableOpacity
                          key={bourbonId}
                          onPress={() => router.push(`/bourbon/${bourbonId}`)}
                          className="bg-brand-800 rounded-xl p-3 mr-3 w-44"
                        >
                          <Text className="text-brand-100 font-semibold text-sm" numberOfLines={2}>
                            {b.name}
                          </Text>
                          {b.distillery ? (
                            <Text className="text-brand-400 text-xs mt-0.5" numberOfLines={1}>
                              {b.distillery}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <View className="h-px bg-brand-700 mt-4 mb-2" />
                </View>
              )}
              {/* ── Count line ── */}
              {bourbons && bourbons.length > 0 ? (
                <Text className="text-brand-500 text-xs pt-1">
                  {bourbons.length} {bourbons.length === 1 ? "bourbon" : "bourbons"}
                  {hasActiveFilters ? " (filtered)" : ""}
                </Text>
              ) : null}
            </>
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
                    className="flex-1 ml-3 bg-brand-600 rounded-xl py-2 items-center"
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
              <Text className="text-brand-500 text-sm">
                {search || hasActiveFilters
                  ? "No bourbons match your search or filters."
                  : "No bourbons in the database yet."}
              </Text>
              {hasActiveFilters && (
                <TouchableOpacity onPress={resetFilters} className="mt-2">
                  <Text className="text-brand-400 text-sm underline">Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      <FilterSheet
        visible={filterSheetVisible}
        filters={filters}
        onApply={applyFilters}
        onClose={() => setFilterSheetVisible(false)}
        showSocialSort
      />
    </View>
  );
}
